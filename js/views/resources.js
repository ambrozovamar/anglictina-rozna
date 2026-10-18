// Knihovna externích zdrojů a nástrojů (Wordwall, Kahoot, YouTube, vlastní soubory…).
import * as store from '../store.js';
import { GRADES, GRADE_IDS, TOOLS } from '../curriculum.js';
import { esc, $, $$, safeUrl } from '../util.js';
import { modal } from './grade.js';

const forGrade = (g) =>
  store.all('resources')
    .filter((r) => g == null || !r.grades?.length || r.grades.includes(g))
    .sort((a, b) => (a.tool || '').localeCompare(b.tool || '') || a.title.localeCompare(b.title));

export function resourceList(g = null, q = '') {
  const s = q.toLowerCase();
  const list = forGrade(g).filter((r) => !s || [r.title, r.tool, r.topic, r.notes].join(' ').toLowerCase().includes(s));
  return `
    <div class="row between no-print" style="margin-bottom:12px">
      <input type="search" id="res-q" placeholder="Hledat…" value="${esc(q)}" style="max-width:280px">
      <button class="btn primary" id="res-add">＋ Přidat zdroj</button>
    </div>
    ${list.length ? `<div class="grid grid-2">${list.map((r) => `
      <div class="card" data-rid="${r.id}">
        <div class="row between">
          <span class="badge">${esc(r.tool || 'Jiné')}</span>
          <span class="row">${(r.grades || []).map((x) => `<span class="gtag g${x}">${x}.</span>`).join('')}${r.visible ? '<span class="badge eye">👁</span>' : ''}</span>
        </div>
        <h3 style="margin:8px 0 2px"><a href="${esc(safeUrl(r.url))}" target="_blank" rel="noopener">${esc(r.title)} ↗</a></h3>
        ${r.topic ? `<div class="small"><b>Téma:</b> ${esc(r.topic)}</div>` : ''}
        ${r.notes ? `<div class="small muted">${esc(r.notes)}</div>` : ''}
        <button class="btn sm ghost no-print" data-edit style="margin-top:6px">Upravit</button>
      </div>`).join('')}</div>`
      : '<div class="empty">Žádné zdroje. Přidejte odkaz na hru ve Wordwallu, Kahoot, video…</div>'}`;
}

export function bindResourceList(root, g, redraw) {
  const q = $('#res-q', root);
  q.addEventListener('input', () => {
    const pos = q.selectionStart;
    root.innerHTML = resourceList(g, q.value);
    bindResourceList(root, g, redraw);
    const nq = $('#res-q', root);
    nq.focus();
    nq.setSelectionRange(pos, pos);
  });
  $('#res-add', root).addEventListener('click', () =>
    editResource({ title: '', url: '', tool: 'Wordwall', grades: g ? [g] : [], topic: '', notes: '', visible: false }, redraw)
  );
  $$('[data-rid]', root).forEach((c) =>
    $('[data-edit]', c).addEventListener('click', () => editResource(store.get('resources', c.dataset.rid), redraw))
  );
}

export function editResource(r, done) {
  modal(`
    <h2>${r.id ? 'Upravit zdroj' : 'Nový zdroj'}</h2>
    <label class="field"><span>Název</span><input name="title" value="${esc(r.title)}" required placeholder="např. Colours – Match up"></label>
    <label class="field"><span>Odkaz (URL)</span><input name="url" value="${esc(r.url)}" placeholder="https://wordwall.net/…"></label>
    <div class="fields-3">
      <label class="field"><span>Nástroj</span><select name="tool">${TOOLS.map((t) => `<option ${r.tool === t ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
      <label class="field"><span>Téma</span><input name="topic" value="${esc(r.topic)}" placeholder="např. Outdoors"></label>
    </div>
    <div class="field"><span style="font-weight:700;font-size:.88rem">Ročníky</span>
      <div class="row">${GRADE_IDS.map((g) => `<label class="row small"><input type="checkbox" name="g" value="${g}" ${r.grades?.includes(g) ? 'checked' : ''}> ${GRADES[g].name}</label>`).join('')}</div>
    </div>
    <label class="field"><span>Poznámka</span><textarea name="notes">${esc(r.notes)}</textarea></label>
    <label class="row small"><input type="checkbox" name="visible" ${r.visible ? 'checked' : ''}> Vidí děti <span class="muted">(připraveno pro dětské účty)</span></label>`,
  async (f) => {
    await store.save('resources', {
      ...r,
      title: f.get('title'),
      url: f.get('url'),
      tool: f.get('tool'),
      topic: f.get('topic'),
      notes: f.get('notes'),
      grades: f.getAll('g').map(Number),
      grade: null,
      visible: f.get('visible') === 'on',
    });
    done();
  },
  r.id ? async () => { await store.remove('resources', r.id); done(); } : null);
}

export function renderResources(view) {
  view.innerHTML = `
    <div class="page-head"><div><h1>Zdroje a nástroje</h1>
      <p class="muted">Odkazy na hry, kvízy, videa a vlastní materiály. Ke každé aktivitě v hodině je pak můžete připojit.</p></div></div>
    <div id="res"></div>`;
  const draw = () => {
    $('#res', view).innerHTML = resourceList(null);
    bindResourceList($('#res', view), null, draw);
  };
  draw();
}
