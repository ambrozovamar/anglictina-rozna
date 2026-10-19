// Nastavení: režim ukládání, záloha a obnova dat.
import * as store from '../store.js';
import { GRADES, GRADE_IDS } from '../curriculum.js';
import { esc, $, toast, today } from '../util.js';
import { summary, downloadSummary } from '../summary.js';

export function renderSettings(view) {
  const n = (t) => store.all(t).length;
  view.innerHTML = `
    <div class="page-head"><div><h1>Nastavení</h1></div></div>
    <div class="grid grid-2">
      <section class="card stack">
        <h2>Ukládání dat</h2>
        ${store.online
          ? '<p>☁️ Aplikace je připojená k databázi <b>Firebase</b>. Data jsou dostupná z každého zařízení po přihlášení.</p>'
          : `<p>💾 <b>Offline režim</b> – data jsou jen v tomto prohlížeči na tomto počítači.</p>
             <p class="small muted">Pro přihlašování a přístup odkudkoli připojte Firebase (návod v README.md, soubor <code>js/config.js</code>).
             Data z tohoto prohlížeče se při prvním přihlášení do databáze přenesou sama.</p>`}
        <p class="small">Uloženo: ${n('lessons')} hodin · ${n('vocab')} slovíček · ${n('topics')} témat · ${n('resources')} zdrojů</p>
      </section>
      <section class="card stack" id="prep" hidden>
        <h2>Připravené hodiny od Clauda</h2>
        <p class="small muted">Připravené hodiny jsou na webu zašifrované. Zadejte jednou heslo webu (Dokumenty\\Anglictina\\heslo-webu.txt) – uloží se k vašemu účtu a hodiny se budou načítat na každém zařízení.</p>
        <form id="unlock" class="row"><input type="password" name="pw" placeholder="Heslo webu" autocomplete="off" style="flex:1"><button class="btn primary">Odemknout</button></form>
      </section>
      <section class="card stack">
        <h2>Přehled pro Clauda</h2>
        <p class="small muted">Všechny hodiny, reflexe (co děti zvládly a co ne) a stav slovíček po ročnících v jednom textu.
          Claude ho čte z databáze při přípravě dalších hodin. Můžete si ho i stáhnout nebo zkopírovat.</p>
        <div class="row">
          <button class="btn" id="sumDl">📋 Stáhnout přehled</button>
          <button class="btn" id="sumCopy">Kopírovat do schránky</button>
        </div>
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

  store.preparedLocked().then((l) => { const s = $('#prep', view); if (s) s.hidden = !l; });
  $('#unlock', view).addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await store.unlockPrepared(new FormData(e.target).get('pw'));
      toast('Připravené hodiny odemčené a načtené.');
      renderSettings(view);
    } catch (err) {
      toast(err.message, 'err');
    }
  });

  $('#sumDl', view).addEventListener('click', downloadSummary);
  $('#sumCopy', view).addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(summary());
      toast('Přehled zkopírován.');
    } catch {
      toast('Kopírování se nepovedlo – použijte Stáhnout.', 'err');
    }
  });

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
