// Stránka ročníku: hodiny (časová osa), témata, slovní zásoba, zdroje.
import * as store from '../store.js';
import { GRADES, VOCAB_STATUS } from '../curriculum.js';
import { esc, $, $$, fmtDate, today, toast, lines, plural } from '../util.js';
import * as L from '../lessons.js';
import { resourceList, bindResourceList } from './resources.js';

export function renderGrade(view, g, tab) {
  const G = GRADES[g];
  const tabs = [
    ['hodiny', 'Hodiny'],
    ['temata', 'Témata'],
    ['slovicka', 'Slovní zásoba'],
    ['zdroje', 'Zdroje'],
  ];
  view.classList.add('g' + g);
  view.innerHTML = `
    <div class="page-head">
      <div>
        <h1>${G.name}</h1>
        <p class="muted">${G.kids} dětí · ${G.year} · ${G.slots.map((s) => `${['', 'po', 'út'][s.weekday]} ${s.period} (${s.minutes} min)`).join(', ')}</p>
        <p class="small" style="margin-top:6px;max-width:720px">${esc(G.note)}</p>
      </div>
    </div>
    <nav class="tabs">${tabs.map(([k, l]) => `<a href="#/rocnik/${g}/${k}" class="${tab === k ? 'active' : ''}">${l}</a>`).join('')}</nav>
    <div id="tab"></div>`;
  const el = $('#tab', view);
  ({ hodiny: tabLessons, temata: tabTopics, slovicka: tabVocab, zdroje: tabResources }[tab] || tabLessons)(el, g);
}

// ---------- Hodiny ----------

function tabLessons(el, g) {
  const list = L.lessonsOf(g);
  const t = today();
  const next = L.nextSlots(g, 1)[0];
  const hasNext = next && L.lessonOn(g, next.date);

  let todayShown = false;
  const items = list.map((l) => {
    let marker = '';
    if (!todayShown && l.date >= t) {
      todayShown = true;
      marker = `<div class="tl-today">Dnes – ${fmtDate(t)}</div>`;
    }
    const topic = l.topicId ? store.get('topics', l.topicId) : null;
    const carry = lines(l.reflection?.carryOver);
    const st = l.status === 'done'
      ? '<span class="badge done">✓ odučeno</span>'
      : l.date < t ? '<span class="badge todo">doplnit reflexi</span>' : '<span class="badge planned">připraveno</span>';
    return `${marker}
      <div class="tl-item ${l.status === 'done' ? 'done' : ''}">
        <a class="card" href="#/hodina/${l.id}">
          <div class="row between">
            <b>${fmtDate(l.date, { long: true })} · ${esc(l.period)}</b>
            <span class="row">${l.visible ? '<span class="badge eye">👁 vidí děti</span>' : ''}${st}</span>
          </div>
          <div style="font-weight:700;margin-top:2px">${esc(l.title || 'Bez názvu')}</div>
          <div class="small muted">${topic ? esc(topic.title) + ' · ' : ''}${plural((l.activities || []).length, 'aktivita', 'aktivity', 'aktivit')} · ${L.totalMinutes(l)}/${l.minutes} min · ${plural((l.vocabIds || []).length, 'slovíčko', 'slovíčka', 'slovíček')}</div>
          ${carry.length ? `<div class="small" style="margin-top:6px">➜ přenést: ${carry.map(esc).join('; ')}</div>` : ''}
        </a>
      </div>`;
  }).join('');

  el.innerHTML = `
    <div class="row between no-print" style="margin-bottom:14px">
      <div class="row">
        ${next && !hasNext ? `<button class="btn primary" id="new-next">＋ Připravit další hodinu (${fmtDate(next.date)})</button>` : ''}
        ${hasNext ? `<a class="btn primary" href="#/hodina/${hasNext.id}">Otevřít další hodinu (${fmtDate(next.date)})</a>` : ''}
      </div>
      <div class="row">
        <label class="small muted">Jiný termín:</label>
        <input type="date" id="new-date" style="width:auto">
        <button class="btn sm" id="new-at">Založit</button>
      </div>
    </div>
    ${list.length ? `<div class="timeline">${items}${todayShown ? '' : `<div class="tl-today">Dnes – ${fmtDate(t)}</div>`}</div>`
      : `<div class="empty">Zatím žádná hodina. Začněte tlačítkem „Připravit další hodinu“ – každá další pak naváže na předchozí.</div>`}`;

  $('#new-next', el)?.addEventListener('click', async () => {
    const l = await L.createLesson(g, next.date);
    location.hash = `#/hodina/${l.id}`;
  });
  $('#new-at', el).addEventListener('click', async () => {
    const d = $('#new-date', el).value;
    if (!d) return toast('Vyberte datum.', 'err');
    const l = await L.createLesson(g, d);
    location.hash = `#/hodina/${l.id}`;
  });
}

// ---------- Témata ----------

const TOPIC_STATUS = { planned: 'plánujeme', current: 'právě probíráme', done: 'probráno' };

function tabTopics(el, g) {
  const topics = L.topicsOf(g);
  const lessons = L.lessonsOf(g);
  el.innerHTML = `
    <div class="card">
      <p class="small muted">Podle tematického plánu. Označte, co právě probíráte – nová hodina si téma převezme automaticky.</p>
      ${topics.map((t) => {
        const n = lessons.filter((l) => l.topicId === t.id).length;
        return `<div class="topic ${t.status}" data-id="${t.id}">
          <div><b>${esc(t.months)}</b><div class="small muted">${plural(n, 'hodina', 'hodiny', 'hodin')}</div></div>
          <div>
            <div style="font-weight:800">${esc(t.title)}</div>
            <div class="small">${esc(t.content)}</div>
            ${t.note ? `<div class="small muted" style="margin-top:4px">📝 ${esc(t.note)}</div>` : ''}
          </div>
          <div class="stack no-print" style="min-width:150px">
            <div class="seg">${Object.entries(TOPIC_STATUS).map(([k, v]) =>
              `<button data-status="${k}" class="${t.status === k ? 'on v-plain' : ''}" title="${v}">${k === 'planned' ? '○' : k === 'current' ? '▶' : '✓'}</button>`).join('')}</div>
            <button class="btn sm ghost" data-edit>Upravit</button>
          </div>
        </div>`;
      }).join('')}
      <div class="no-print" style="margin-top:12px"><button class="btn sm" id="add-topic">＋ Přidat téma</button></div>
    </div>`;

  $$('.topic', el).forEach((row) => {
    const t = store.get('topics', row.dataset.id);
    $$('[data-status]', row).forEach((b) =>
      b.addEventListener('click', async () => {
        if (b.dataset.status === 'current') {
          // Jen jedno téma může být „právě probíráme“; předchozí se označí jako probrané.
          for (const o of L.topicsOf(g)) if (o.status === 'current' && o.id !== t.id) await store.save('topics', { ...o, status: 'done' });
        }
        await store.save('topics', { ...t, status: b.dataset.status });
        tabTopics(el, g);
      })
    );
    $('[data-edit]', row).addEventListener('click', () => editTopic(t, g, () => tabTopics(el, g)));
  });
  $('#add-topic', el).addEventListener('click', () =>
    editTopic({ grade: g, order: topics.length, status: 'planned', months: '', title: '', content: '' }, g, () => tabTopics(el, g))
  );
}

function editTopic(t, g, done) {
  modal(`
    <h2>${t.id ? 'Upravit téma' : 'Nové téma'}</h2>
    <label class="field"><span>Měsíc(e)</span><input name="months" value="${esc(t.months)}"></label>
    <label class="field"><span>Název</span><input name="title" value="${esc(t.title)}" required></label>
    <label class="field"><span>Obsah (slovní zásoba, vazby, aktivity)</span><textarea name="content">${esc(t.content)}</textarea></label>
    <label class="field"><span>Moje poznámka</span><textarea name="note">${esc(t.note || '')}</textarea></label>`,
  async (f) => {
    await store.save('topics', { ...t, months: f.get('months'), title: f.get('title'), content: f.get('content'), note: f.get('note') });
    done();
  },
  t.id ? async () => { await store.remove('topics', t.id); done(); } : null);
}

// ---------- Slovní zásoba ----------

export function parseVocab(text) {
  // „green = zelená“ nebo „I have got – mám“ ; víceslovné = ustálené spojení
  const [term, cz = ''] = text.split(/\s*[=–—]\s*|\s+-\s+/);
  return { term: term.trim(), cz: cz.trim(), kind: term.trim().includes(' ') ? 'chunk' : 'word' };
}

function tabVocab(el, g, filter = 'all') {
  const all = L.vocabOf(g);
  const list = filter === 'all' ? all : all.filter((v) => v.status === filter);
  const topics = L.topicsOf(g);
  const count = (s) => all.filter((v) => v.status === s).length;

  el.innerHTML = `
    <div class="card stack">
      <form id="add-vocab" class="row no-print">
        <input name="t" placeholder="např. green = zelená   nebo   I have got = mám" style="flex:1;min-width:220px" required>
        <select name="topic" style="width:auto">${topics.map((t) => `<option value="${t.id}" ${t.status === 'current' ? 'selected' : ''}>${esc(t.title)}</option>`).join('')}</select>
        <button class="btn primary">Přidat</button>
      </form>
      <div class="hint">Tip: více slov najednou – každé na nový řádek přes „Hromadně“. Víceslovné výrazy se uloží jako ustálená spojení (chunks).</div>
      <div class="row between no-print">
        <div class="seg" id="vfilter">
          <button data-f="all" class="${filter === 'all' ? 'on v-plain' : ''}">vše (${all.length})</button>
          ${Object.entries(VOCAB_STATUS).map(([k, v]) => `<button data-f="${k}" class="${filter === k ? 'on v-' + k : ''}">${v.label} (${count(k)})</button>`).join('')}
        </div>
        <button class="btn sm" id="bulk">Hromadně</button>
      </div>
      ${list.length ? `<div class="table-wrap"><table class="list">
        <thead><tr><th>Anglicky</th><th>Česky</th><th>Druh</th><th>Téma</th><th>Stav</th><th></th></tr></thead>
        <tbody>${list.map((v) => `<tr data-id="${v.id}">
          <td><b>${esc(v.term)}</b></td><td>${esc(v.cz)}</td>
          <td class="small muted">${v.kind === 'chunk' ? 'spojení' : 'slovo'}</td>
          <td class="small">${esc(store.get('topics', v.topicId)?.title || '')}</td>
          <td>${vocabSeg(v)}</td>
          <td><button class="btn sm ghost danger" data-del title="Smazat">✕</button></td>
        </tr>`).join('')}</tbody></table></div>`
      : `<div class="empty">Zatím žádná slovíčka${filter !== 'all' ? ' v tomto stavu' : ''}.</div>`}
    </div>`;

  $('#add-vocab', el).addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    await store.save('vocab', { grade: g, topicId: f.get('topic'), status: 'new', ...parseVocab(f.get('t')) });
    tabVocab(el, g, filter);
    $('#add-vocab [name=t]', el).focus();
  });
  $('#bulk', el).addEventListener('click', () =>
    modal(`<h2>Přidat více slovíček</h2>
      <label class="field"><span>Každé slovo / spojení na nový řádek</span><textarea name="t" rows="10" placeholder="red = červená&#10;blue = modrá&#10;What colour is it? = Jakou to má barvu?"></textarea></label>
      <label class="field"><span>Téma</span><select name="topic">${topics.map((t) => `<option value="${t.id}" ${t.status === 'current' ? 'selected' : ''}>${esc(t.title)}</option>`).join('')}</select></label>`,
    async (f) => {
      const rows = lines(f.get('t')).map((x) => ({ grade: g, topicId: f.get('topic'), status: 'new', ...parseVocab(x) }));
      await store.saveMany('vocab', rows);
      toast(`Přidáno ${rows.length} položek.`);
      tabVocab(el, g, filter);
    })
  );
  $$('#vfilter button', el).forEach((b) => b.addEventListener('click', () => tabVocab(el, g, b.dataset.f)));
  bindVocabSeg(el, () => tabVocab(el, g, filter));
  $$('[data-del]', el).forEach((b) =>
    b.addEventListener('click', async () => {
      const id = b.closest('tr').dataset.id;
      if (!confirm('Smazat slovíčko?')) return;
      await store.remove('vocab', id);
      tabVocab(el, g, filter);
    })
  );
}

export const vocabSeg = (v) =>
  `<div class="seg" data-vid="${v.id}">${Object.entries(VOCAB_STATUS).map(([k, s]) =>
    `<button type="button" data-vs="${k}" class="${v.status === k ? 'on v-' + k : ''}">${s.short}</button>`).join('')}</div>`;

export function bindVocabSeg(root, after) {
  $$('[data-vid] [data-vs]', root).forEach((b) =>
    b.addEventListener('click', async () => {
      const v = store.get('vocab', b.closest('[data-vid]').dataset.vid);
      await store.save('vocab', { ...v, status: b.dataset.vs });
      after();
    })
  );
}

// ---------- Zdroje ročníku ----------

function tabResources(el, g) {
  el.innerHTML = `<div id="res"></div>`;
  const draw = () => {
    $('#res', el).innerHTML = resourceList(g);
    bindResourceList($('#res', el), g, draw);
  };
  draw();
}

// ---------- Modal ----------

export function modal(inner, onSave, onDelete = null) {
  const bg = document.createElement('div');
  bg.className = 'modal-bg';
  bg.innerHTML = `<form class="card modal stack">${inner}
    <div class="row between">
      <div>${onDelete ? '<button type="button" class="btn danger" data-delete>Smazat</button>' : ''}</div>
      <div class="row"><button type="button" class="btn" data-cancel>Zrušit</button><button class="btn primary">Uložit</button></div>
    </div></form>`;
  document.body.appendChild(bg);
  const close = () => bg.remove();
  bg.addEventListener('click', (e) => e.target === bg && close());
  $('[data-cancel]', bg).addEventListener('click', close);
  $('[data-delete]', bg)?.addEventListener('click', async () => {
    if (!confirm('Opravdu smazat?')) return;
    await onDelete();
    close();
  });
  $('form', bg).addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await onSave(new FormData(e.target));
      close();
    } catch (err) {
      toast(err.message, 'err');
    }
  });
  $('input, textarea', bg)?.focus();
}
