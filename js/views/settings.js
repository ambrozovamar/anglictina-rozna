// Nastavení: režim ukládání, záloha a obnova dat.
import * as store from '../store.js';
import { GRADES, GRADE_IDS } from '../curriculum.js';
import { esc, $, toast, today } from '../util.js';

export function renderSettings(view) {
  const n = (t) => store.all(t).length;
  view.innerHTML = `
    <div class="page-head"><div><h1>Nastavení</h1></div></div>
    <div class="grid grid-2">
      <section class="card stack">
        <h2>Ukládání dat</h2>
        ${store.online
          ? '<p>☁️ Aplikace je připojená k databázi Supabase. Data jsou dostupná z každého počítače po přihlášení.</p>'
          : `<p>💾 <b>Offline režim</b> – data jsou jen v tomto prohlížeči na tomto počítači.</p>
             <p class="small muted">Pro přihlašování a přístup odkudkoli připojte Supabase (návod v README.md, soubor <code>js/config.js</code>).
             Před přechodem si stáhněte zálohu a po připojení ji nahrajte.</p>`}
        <p class="small">Uloženo: ${n('lessons')} hodin · ${n('vocab')} slovíček · ${n('topics')} témat · ${n('resources')} zdrojů</p>
      </section>
      <section class="card stack">
        <h2>Záloha</h2>
        <p class="small muted">Stáhne všechna data do jednoho souboru. Nahráním zálohy se záznamy doplní nebo přepíší.</p>
        <div class="row">
          <button class="btn primary" id="export">⬇ Stáhnout zálohu</button>
          <label class="btn">⬆ Nahrát zálohu<input type="file" id="import" accept=".json,application/json" hidden></label>
        </div>
      </section>
      <section class="card stack">
        <h2>Rozvrh</h2>
        ${GRADE_IDS.map((g) => `<div><b>${GRADES[g].name}</b>: ${GRADES[g].slots.map((s) => `${['', 'pondělí', 'úterý'][s.weekday]} ${esc(s.period)} – ${s.minutes} min, ${esc(s.equipment)}`).join('; ')}</div>`).join('')}
        <p class="small muted">Rozvrh je v souboru <code>js/curriculum.js</code>.</p>
      </section>
    </div>`;

  $('#export', view).addEventListener('click', () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([store.exportJSON()], { type: 'application/json' }));
    a.download = `aj-rozna-zaloha-${today()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  });
  $('#import', view).addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      await store.importJSON(await file.text());
      toast('Záloha nahrána.');
      renderSettings(view);
    } catch (err) {
      toast(err.message, 'err');
    }
  });
}
