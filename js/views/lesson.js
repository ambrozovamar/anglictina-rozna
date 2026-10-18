// Příprava jedné hodiny: základ, cíle, průběh (aktivity), slovní zásoba, reflexe.
import * as store from '../store.js';
import { GRADES, FORMS, ACTIVITY_TEMPLATES } from '../curriculum.js';
import { esc, $, $$, fmtDate, lines, unlines, debounce, toast, safeUrl, today } from '../util.js';
import * as L from '../lessons.js';
import { vocabSeg, bindVocabSeg, parseVocab } from './grade.js';
import { slotFor } from '../schedule.js';

export function renderLesson(view, id) {
  let l = structuredClone(store.get('lessons', id));
  const g = l.grade;
  const G = GRADES[g];
  view.classList.add('g' + g);

  const persist = async () => {
    try {
      await store.save('lessons', l);
      const s = $('#saved', view);
      if (s) s.textContent = 'Uloženo ' + new Date().toLocaleTimeString('cs', { hour: '2-digit', minute: '2-digit' });
    } catch (err) {
      toast(err.message, 'err');
    }
  };
  const saveSoon = debounce(persist, 500);
  const rerender = async () => {
    await persist();
    const y = window.scrollY;
    renderLesson(view, id);
    window.scrollTo(0, y);
  };

  const prev = l.prevId ? store.get('lessons', l.prevId) : L.lessonBefore(g, l.date);
  const topics = L.topicsOf(g);
  const total = L.totalMinutes(l);
  const acts = l.activities || [];
  const resources = store.all('resources').filter((r) => !r.grades?.length || r.grades.includes(g));

  // Upozornění podle podmínek ročníku
  const warns = [];
  if (total > l.minutes) warns.push(`Plán má ${total} min, hodina jen ${l.minutes} min.`);
  if (acts.length && !acts.some((a) => a.form === 'pohyb')) warns.push('Chybí pohybová aktivita.');
  if (l.minutes >= 90 && !acts.some((a) => /přestávk/i.test(a.name))) warns.push('Dvouhodinovka: zařaďte pohybovou přestávku s jasným začátkem a koncem.');
  if (!slotFor(g, l.date)) warns.push('V tento den ročník podle rozvrhu angličtinu nemá.');

  const lessonVocab = (l.vocabIds || []).map((x) => store.get('vocab', x)).filter(Boolean);
  const otherVocab = L.vocabOf(g).filter((v) => !l.vocabIds?.includes(v.id));
  const curTopicId = l.topicId;
  otherVocab.sort((a, b) => (b.topicId === curTopicId) - (a.topicId === curTopicId) || (b.status === 'weak') - (a.status === 'weak'));

  const prevBox = prev
    ? `<div class="carry small">
        <b>Minulá hodina – <a href="#/hodina/${prev.id}">${fmtDate(prev.date)}</a></b> ${prev.status === 'done' ? '' : '<span class="badge todo">bez reflexe</span>'}
        ${prev.reflection?.learned ? `<div>✅ ${esc(prev.reflection.learned)}</div>` : ''}
        ${prev.reflection?.notLearned ? `<div>⚠️ ${esc(prev.reflection.notLearned)}</div>` : ''}
        ${prev.reflection?.carryOver ? `<div>➜ ${esc(prev.reflection.carryOver)}</div>` : ''}
        ${prev.reflection?.behaviour ? `<div>🙋 ${esc(prev.reflection.behaviour)}</div>` : ''}
        ${!prev.reflection?.learned && !prev.reflection?.notLearned && !prev.reflection?.carryOver ? '<div class="muted">Reflexe zatím nevyplněná.</div>' : ''}
      </div>`
    : '<div class="small muted">Toto je první hodina v řadě.</div>';

  view.innerHTML = `
    <div class="page-head">
      <div>
        <a href="#/rocnik/${g}" class="small no-print">← ${G.name}</a>
        <h1 style="margin-top:4px">${fmtDate(l.date, { long: true })} <span class="gtag">${G.name}</span></h1>
        <p class="muted">${esc(l.period)} · ${l.minutes} min · ${esc(l.equipment)} · <span id="saved" class="saved">Ukládá se automaticky</span></p>
      </div>
      <div class="row no-print">
        ${l.status === 'done' ? '<span class="badge done">✓ odučeno</span>' : ''}
        <button class="btn" id="print">🖨 Tisk</button>
        <button class="btn primary" id="continue">Navázat další hodinou →</button>
      </div>
    </div>

    <div class="lesson-grid">
      <div class="stack">
        <section class="card stack">
          <div class="fields-3">
            <label class="field" style="grid-column:1/-1"><span>Název hodiny</span><input data-k="title" value="${esc(l.title)}" placeholder="např. Colours & numbers – Lucky says"></label>
            <label class="field"><span>Téma</span><select data-k="topicId"><option value="">—</option>${topics.map((t) => `<option value="${t.id}" ${t.id === l.topicId ? 'selected' : ''}>${esc(t.title)}</option>`).join('')}</select></label>
            <label class="field"><span>Datum</span><input type="date" data-k="date" value="${esc(l.date)}"></label>
            <label class="field"><span>Délka (min)</span><input type="number" min="15" step="5" data-k="minutes" value="${l.minutes}"></label>
          </div>
          ${prevBox}
          <label class="field"><span>Cíle hodiny – co mají děti umět</span>
            <textarea data-k="goals" data-lines placeholder="Každý cíl na nový řádek, např.&#10;Děti řeknou barvy hraček: It's red.">${esc(unlines(l.goals))}</textarea></label>
        </section>

        <section class="card">
          <div class="section-title"><h2>Průběh hodiny</h2><b>${total} / ${l.minutes} min</b></div>
          <div class="timebar">${acts.map((a) => `<div class="f-${a.form}" style="flex:${Math.max(1, Number(a.minutes) || 0)}" title="${esc(a.name)} – ${a.minutes} min">${esc(a.name)}</div>`).join('')}
            ${total < l.minutes ? `<div style="flex:${l.minutes - total};background:transparent;color:var(--muted)">volno ${l.minutes - total}′</div>` : ''}</div>
          <div class="small muted row" style="margin-bottom:10px">${Object.values(FORMS).map((f) => `<span>${f.icon} ${f.label}</span>`).join(' · ')}</div>
          ${warns.map((w) => `<div class="act-warn" style="padding:0 0 6px">⚠️ ${esc(w)}</div>`).join('')}

          <div id="acts">${acts.map((a, i) => activityHtml(a, i, acts.length, G, resources)).join('')}</div>

          <div class="no-print" style="margin-top:12px">
            <div class="small muted" style="margin-bottom:6px">Přidat aktivitu ze šablony:</div>
            <div class="tpl-list">
              ${ACTIVITY_TEMPLATES.map((t) => `<button class="tpl" data-tpl="${esc(t.name)}">＋ ${esc(t.name)} <span class="muted">${t.minutes}′</span></button>`).join('')}
              <button class="tpl" data-blank>＋ Vlastní aktivita</button>
            </div>
          </div>
        </section>

        <section class="card reflect stack" id="reflexe">
          <div class="section-title"><h2>Po hodině – reflexe</h2>
            <label class="row small no-print"><input type="checkbox" id="done" ${l.status === 'done' ? 'checked' : ''}> <b>Odučeno</b></label></div>
          <p class="small muted">Vyplňte po hodině. Další hodina si odsud převezme „co přenést“ a slovíčka, která děti ještě neumí.</p>
          <label class="field"><span>✅ Co se naučili / co fungovalo</span><textarea data-k="reflection.learned">${esc(l.reflection?.learned)}</textarea></label>
          <label class="field"><span>⚠️ Co nezvládli / nestihli</span><textarea data-k="reflection.notLearned">${esc(l.reflection?.notLearned)}</textarea></label>
          <label class="field"><span>➜ Co přenést do další hodiny</span><textarea data-k="reflection.carryOver" placeholder="Každá položka na nový řádek – objeví se jako cíl další hodiny">${esc(l.reflection?.carryOver)}</textarea></label>
          <label class="field"><span>🙋 Děti, chování, diferenciace</span><textarea data-k="reflection.behaviour" placeholder="Kdo potřebuje víc podpory, kdo byl napřed, co pomohlo s kázní…">${esc(l.reflection?.behaviour)}</textarea></label>
          ${lessonVocab.length ? `<div><b class="small">Jak umí slovíčka z hodiny</b>
            <div class="stack" style="margin-top:8px">${lessonVocab.map((v) => `<div class="row between"><span><b>${esc(v.term)}</b> <span class="muted small">${esc(v.cz)}</span></span>${vocabSeg(v)}</div>`).join('')}</div></div>` : ''}
        </section>
      </div>

      <aside class="stack">
        <section class="card">
          <h2>Slovní zásoba</h2>
          <div class="chips" style="margin-bottom:10px">
            ${lessonVocab.length ? lessonVocab.map((v) => `<button class="chip on st-${v.status}" data-unv="${v.id}" title="Odebrat z hodiny">${esc(v.term)} <span class="cz">${esc(v.cz)}</span> ✕</button>`).join('') : '<span class="small muted">Zatím nic – vyberte níže nebo přidejte.</span>'}
          </div>
          <form id="nv" class="row no-print"><input name="t" placeholder="nové: red = červená" style="flex:1"><button class="btn sm">＋</button></form>
          ${otherVocab.length ? `<details class="no-print" style="margin-top:10px" ${lessonVocab.length ? '' : 'open'}><summary class="small"><b>Vybrat z banky (${otherVocab.length})</b></summary>
            <div class="chips" style="margin-top:8px">${otherVocab.map((v) => `<button class="chip st-${v.status}" data-addv="${v.id}">${esc(v.term)}</button>`).join('')}</div></details>` : ''}
          <div class="hint">Barva okraje: šedá nové · modrá procvičujeme · oranžová opakovat · zelená umí</div>
        </section>

        <section class="card stack">
          <label class="field"><span>Pomůcky a příprava</span><textarea data-k="materials" placeholder="flashcards barvy, míček, Wordwall na tabuli…">${esc(l.materials)}</textarea></label>
          <label class="field"><span>Poznámky</span><textarea data-k="notes">${esc(l.notes)}</textarea></label>
          <label class="row small"><input type="checkbox" id="visible" ${l.visible ? 'checked' : ''}> Vidí děti <span class="muted">(připraveno pro dětské účty)</span></label>
        </section>

        <section class="card small">
          <b>Připomínka k ročníku</b>
          <p class="muted" style="margin-top:4px">${esc(G.note)}</p>
          <button class="btn sm ghost danger no-print" id="del">Smazat hodinu</button>
        </section>
      </aside>
    </div>`;

  // --- Pole s automatickým ukládáním ---
  $$('[data-k]', view).forEach((inp) =>
    inp.addEventListener('input', () => {
      const path = inp.dataset.k.split('.');
      let v = inp.value;
      if (inp.dataset.lines !== undefined) v = lines(v);
      if (inp.type === 'number') v = Number(v);
      if (path.length === 2) l[path[0]] = { ...(l[path[0]] || {}), [path[1]]: v };
      else l[path[0]] = v;
      saveSoon();
    })
  );
  $('[data-k=date]', view).addEventListener('change', async () => {
    const s = slotFor(g, l.date);
    if (s) Object.assign(l, { period: s.period, minutes: s.minutes, equipment: s.equipment });
    await rerender();
  });
  $('[data-k=minutes]', view).addEventListener('change', rerender);

  // --- Aktivity ---
  $$('.act', view).forEach((box) => {
    const i = Number(box.dataset.i);
    $$('[data-a]', box).forEach((inp) =>
      inp.addEventListener('input', () => {
        acts[i][inp.dataset.a] = inp.type === 'number' ? Number(inp.value) : inp.value;
        saveSoon();
      })
    );
    $('[data-a=minutes]', box).addEventListener('change', rerender);
    $('[data-a=form]', box).addEventListener('change', rerender);
    $('[data-res]', box)?.addEventListener('change', (e) => {
      const r = store.get('resources', e.target.value);
      acts[i].resourceId = e.target.value;
      if (r) acts[i].url = r.url;
      rerender();
    });
    $('[data-up]', box).addEventListener('click', () => { if (i > 0) { [acts[i - 1], acts[i]] = [acts[i], acts[i - 1]]; rerender(); } });
    $('[data-down]', box).addEventListener('click', () => { if (i < acts.length - 1) { [acts[i + 1], acts[i]] = [acts[i], acts[i + 1]]; rerender(); } });
    $('[data-rm]', box).addEventListener('click', () => { acts.splice(i, 1); rerender(); });
  });
  $$('[data-tpl]', view).forEach((b) =>
    b.addEventListener('click', () => {
      // Rozloučení necháváme na konci
      const at = acts.length && /rozloučení/i.test(acts[acts.length - 1].name) ? acts.length - 1 : acts.length;
      acts.splice(at, 0, L.tpl(b.dataset.tpl));
      l.activities = acts;
      rerender();
    })
  );
  $('[data-blank]', view).addEventListener('click', () => { acts.push(L.blankActivity()); l.activities = acts; rerender(); });

  // --- Slovní zásoba ---
  $$('[data-addv]', view).forEach((b) => b.addEventListener('click', () => { l.vocabIds = [...(l.vocabIds || []), b.dataset.addv]; rerender(); }));
  $$('[data-unv]', view).forEach((b) => b.addEventListener('click', () => { l.vocabIds = l.vocabIds.filter((x) => x !== b.dataset.unv); rerender(); }));
  $('#nv', view).addEventListener('submit', async (e) => {
    e.preventDefault();
    const t = new FormData(e.target).get('t');
    if (!t.trim()) return;
    const v = await store.save('vocab', { grade: g, topicId: l.topicId, status: 'new', ...parseVocab(t) });
    l.vocabIds = [...(l.vocabIds || []), v.id];
    await rerender();
    $('#nv [name=t]', view).focus();
  });
  bindVocabSeg($('#reflexe', view), rerender);

  // --- Ostatní ---
  $('#done', view).addEventListener('change', (e) => {
    l.status = e.target.checked ? 'done' : 'planned';
    if (e.target.checked && l.date > today()) toast('Pozor: hodina je v budoucnosti.');
    rerender();
  });
  $('#visible', view).addEventListener('change', (e) => { l.visible = e.target.checked; persist(); });
  $('#print', view).addEventListener('click', () => {
    $$('.act details', view).forEach((d) => (d.open = true));
    window.print();
  });
  $('#continue', view).addEventListener('click', async () => {
    await persist();
    if (l.status !== 'done' && !l.reflection?.carryOver && !confirm('Reflexe této hodiny ještě není vyplněná. Přesto založit další hodinu?')) return;
    const n = await L.continueLesson(l);
    toast(`Další hodina: ${fmtDate(n.date, { long: true })}`);
    location.hash = `#/hodina/${n.id}`;
  });
  $('#del', view).addEventListener('click', async () => {
    if (!confirm('Smazat tuto hodinu?')) return;
    await store.remove('lessons', l.id);
    location.hash = `#/rocnik/${g}`;
  });
}

function activityHtml(a, i, n, G, resources) {
  const tooLong = G.id === 2 && Number(a.minutes) > G.maxActivity;
  return `
    <div class="act ${tooLong ? 'warn' : ''}" data-i="${i}">
      <div class="act-head">
        <span class="act-num">${i + 1}.</span>
        <input data-a="name" value="${esc(a.name)}" placeholder="Název aktivity" style="font-weight:700">
        <input data-a="minutes" type="number" min="1" max="90" value="${a.minutes}" title="minuty">
        <select data-a="form" class="act-form">${Object.entries(FORMS).map(([k, f]) => `<option value="${k}" ${a.form === k ? 'selected' : ''}>${f.icon} ${f.label}</option>`).join('')}</select>
        <span class="row act-tools" style="gap:2px">
          <button class="btn sm ghost" data-up title="Nahoru" ${i === 0 ? 'disabled' : ''}>↑</button>
          <button class="btn sm ghost" data-down title="Dolů" ${i === n - 1 ? 'disabled' : ''}>↓</button>
          <button class="btn sm ghost danger" data-rm title="Odebrat">✕</button>
        </span>
      </div>
      ${tooLong ? `<div class="act-warn">Ve 2. ročníku držte aktivity do ${G.maxActivity} minut.</div>` : ''}
      <div class="act-body">
        <textarea data-a="description" rows="2" placeholder="Co děláme, pokyny pro děti anglicky (Stand up! Find something red!)">${esc(a.description)}</textarea>
        <input data-a="tip" value="${esc(a.tip)}" placeholder="🧭 Pravidla a kázeň: jak aktivitu uvést, signál pro konec…">
        <details ${a.basic || a.challenge || a.support ? 'open' : ''}>
          <summary class="small"><b>Diferenciace</b> <span class="muted">– základ / ⭐ challenge / 🤝 podpora</span></summary>
          <div class="diff" style="margin-top:8px">
            <label class="field"><span class="small">Základ</span><textarea data-a="basic" rows="2">${esc(a.basic)}</textarea></label>
            <label class="field"><span class="small">⭐ Challenge (nadaní)</span><textarea data-a="challenge" rows="2">${esc(a.challenge)}</textarea></label>
            <label class="field"><span class="small">🤝 Podpora (slabší)</span><textarea data-a="support" rows="2">${esc(a.support)}</textarea></label>
          </div>
        </details>
        <div class="row">
          <select data-res style="flex:1;min-width:180px"><option value="">🔗 Připojit zdroj z knihovny…</option>${resources.map((r) => `<option value="${r.id}" ${a.resourceId === r.id ? 'selected' : ''}>${esc(r.tool)} – ${esc(r.title)}</option>`).join('')}</select>
          <input data-a="url" value="${esc(a.url)}" placeholder="nebo vložte odkaz" style="flex:1;min-width:180px">
          ${a.url ? `<a class="btn sm" href="${esc(safeUrl(a.url))}" target="_blank" rel="noopener">Otevřít ↗</a>` : ''}
        </div>
      </div>
    </div>`;
}
