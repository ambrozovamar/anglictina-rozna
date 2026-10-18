// Tisková verze přípravy: každých 45 min = nejvýš 1 strana A4 (dvouhodinovka = 2 strany).
// Reflexe se netiskne – vyplňuje se po hodině na webu.
import * as store from '../store.js';
import { GRADES, FORMS } from '../curriculum.js';
import { esc, $, $$, fmtDate } from '../util.js';

const PAGE_MM = 272; // A4 297 mm − okraje 2 × 10 mm − rezerva
const MM = 96 / 25.4;
const MAX_PT = 9.5;
const MIN_PT = 7;

// Rozdělení dvouhodinovky: aktivita s názvem „2. HODINA…“, jinak první aktivita začínající v 45. minutě a později.
function splitParts(l) {
  const acts = l.activities || [];
  if (l.minutes < 90 || acts.length < 2) return [acts];
  let at = acts.findIndex((a) => /^\s*2\.\s*hodina/i.test(a.name));
  if (at < 1) {
    let t = 0;
    at = acts.findIndex((a) => (t += Number(a.minutes) || 0) - (Number(a.minutes) || 0) >= 45);
  }
  return at > 0 ? [acts.slice(0, at), acts.slice(at)] : [acts];
}

const cleanName = (n) => String(n || '').replace(/^\s*\d\.\s*hodina\s*[·:–-]\s*/i, '');

function resLabel(u) {
  if (!u) return '';
  const s = String(u).trim();
  if (!/^https?:/i.test(s)) return s.split('/').pop().replace(/\.html?$/i, '');
  try {
    return new URL(s).hostname.replace(/^www\./, '');
  } catch {
    return s;
  }
}

function rows(acts, from) {
  let t = from;
  return acts
    .map((a) => {
      const m = Number(a.minutes) || 0;
      const time = `${t}–${(t += m)}′`;
      const f = FORMS[a.form];
      const diff = [
        a.basic && `<div><b>Z:</b> ${esc(a.basic)}</div>`,
        a.challenge && `<div><b>⭐</b> ${esc(a.challenge)}</div>`,
        a.support && `<div><b>🤝</b> ${esc(a.support)}</div>`,
      ].filter(Boolean).join('');
      return `<tr>
        <td class="pp-time"><b>${time}</b><br>${f ? f.icon : ''} <span>${m} min</span></td>
        <td><b>${esc(cleanName(a.name))}</b>${a.description ? `<div>${esc(a.description)}</div>` : ''}${a.url ? `<div class="pp-res">📎 ${esc(resLabel(a.url))}</div>` : ''}</td>
        <td>${a.tip ? `<div>🧭 ${esc(a.tip)}</div>` : ''}${diff}</td>
      </tr>`;
    })
    .join('');
}

export function printSheet(l) {
  const G = GRADES[l.grade];
  const topic = l.topicId ? store.get('topics', l.topicId) : null;
  const prev = l.prevId ? store.get('lessons', l.prevId) : null;
  const vocab = (l.vocabIds || []).map((x) => store.get('vocab', x)).filter(Boolean);
  const parts = splitParts(l);
  const two = parts.length > 1;
  const r = prev?.reflection || {};
  let from = 0;

  return `<div class="print-sheet">${parts
    .map((acts, i) => {
      const start = from;
      const min = acts.reduce((s, a) => s + (Number(a.minutes) || 0), 0);
      from += min;
      const first = i === 0;
      const last = i === parts.length - 1;
      return `<section class="pp">
        <header class="pp-head">
          <div><b>${fmtDate(l.date, { long: true })}</b> · ${esc(G.name)} · ${esc(l.period)} · ${esc(l.equipment)}</div>
          <div>${two ? `<b>${i + 1}. hodina</b> (${i + 1}/2) · ` : ''}${min} / ${two ? 45 : l.minutes} min</div>
        </header>
        <h1>${esc(l.title || 'Hodina')}${topic ? ` <span>– ${esc(topic.title)}</span>` : ''}</h1>
        ${first && l.goals?.length ? `<div class="pp-line"><b>Cíle:</b> ${l.goals.map(esc).join(' • ')}</div>` : ''}
        ${first && (r.carryOver || r.notLearned) ? `<div class="pp-line"><b>Z minula (${fmtDate(prev.date)}):</b> ${esc([r.notLearned, r.carryOver].filter(Boolean).join('\n').split('\n').map((s) => s.trim()).filter(Boolean).join(' · '))}</div>` : ''}
        ${first && vocab.length ? `<div class="pp-line"><b>Slovíčka:</b> ${vocab.map((v) => esc(v.term)).join(', ')}</div>` : ''}
        ${first && l.materials ? `<div class="pp-line"><b>Pomůcky:</b> ${esc(l.materials)}</div>` : ''}
        <table class="pp-table">
          <colgroup><col style="width:15mm"><col style="width:52%"><col></colgroup>
          <thead><tr><th>Čas</th><th>Aktivita</th><th>Pravidla · diferenciace (Z základ, ⭐ challenge, 🤝 podpora)</th></tr></thead>
          <tbody>${rows(acts, start)}</tbody>
        </table>
        ${last && l.notes ? `<div class="pp-line pp-notes"><b>Poznámky:</b> ${esc(l.notes)}</div>` : ''}
      </section>`;
    })
    .join('')}</div>`;
}

// Zmenší písmo každé strany, dokud se nevejde na A4 (měří se mimo obrazovku v šířce 190 mm).
export function fitSheet(sheet) {
  sheet.classList.add('measure');
  $$('.pp', sheet).forEach((p) => {
    let pt = MAX_PT;
    p.style.fontSize = pt + 'pt';
    while (p.scrollHeight > PAGE_MM * MM && pt > MIN_PT) {
      pt -= 0.25;
      p.style.fontSize = pt + 'pt';
    }
    p.dataset.mm = Math.round(p.scrollHeight / MM);
  });
  sheet.classList.remove('measure');
}

// Před tiskem (tlačítkem i Ctrl+P) sestaví list z aktuálních dat hodiny.
export function preparePrint(view, l) {
  const old = $('.print-sheet', view);
  const tmp = document.createElement('div');
  tmp.innerHTML = printSheet(l);
  const sheet = tmp.firstElementChild;
  if (old) old.replaceWith(sheet);
  else view.appendChild(sheet);
  fitSheet(sheet);
  return sheet;
}
