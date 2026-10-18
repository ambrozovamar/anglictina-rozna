// Drobné pomocné funkce sdílené celou aplikací.

export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const uid = () =>
  (crypto.randomUUID ? crypto.randomUUID() : 'id-' + Date.now().toString(36) + Math.random().toString(36).slice(2));

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const DAY_NAMES = ['neděle', 'pondělí', 'úterý', 'středa', 'čtvrtek', 'pátek', 'sobota'];
const DAY_SHORT = ['ne', 'po', 'út', 'st', 'čt', 'pá', 'so'];

export const toISO = (d) => {
  const z = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
};

export const fromISO = (s) => {
  const [y, m, d] = String(s).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};

export const today = () => toISO(new Date());

export const fmtDate = (iso, { long = false } = {}) => {
  if (!iso) return '—';
  const d = fromISO(iso);
  const day = long ? DAY_NAMES[d.getDay()] : DAY_SHORT[d.getDay()];
  return `${day} ${d.getDate()}. ${d.getMonth() + 1}.${long ? ' ' + d.getFullYear() : ''}`;
};

export const daysBetween = (a, b) => Math.round((fromISO(b) - fromISO(a)) / 86400000);

export const relDay = (iso) => {
  const n = daysBetween(today(), iso);
  if (n === 0) return 'dnes';
  if (n === 1) return 'zítra';
  if (n === -1) return 'včera';
  if (n > 1 && n < 5) return `za ${n} dny`;
  if (n >= 5) return `za ${n} dní`;
  return `před ${-n} dny`;
};

// Textarea → pole řádků (prázdné řádky pryč) a zpět.
export const lines = (s) => String(s || '').split('\n').map((x) => x.trim()).filter(Boolean);
export const unlines = (arr) => (arr || []).join('\n');

// Český plurál: plural(3, 'aktivita', 'aktivity', 'aktivit') → '3 aktivity'
export const plural = (n, one, few, many) => `${n} ${n === 1 ? one : n >= 2 && n <= 4 ? few : many}`;

export function toast(msg, kind = 'ok') {
  let box = $('#toasts');
  if (!box) {
    box = document.createElement('div');
    box.id = 'toasts';
    document.body.appendChild(box);
  }
  const el = document.createElement('div');
  el.className = `toast toast-${kind}`;
  el.textContent = msg;
  box.appendChild(el);
  setTimeout(() => el.classList.add('out'), 2600);
  setTimeout(() => el.remove(), 3100);
}

export function debounce(fn, ms = 600) {
  let t;
  return (...a) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...a), ms);
  };
}

export const safeUrl = (u) => {
  const s = String(u || '').trim();
  if (!s) return '';
  if (/^https?:\/\//i.test(s)) return s;
  // odkazy na materiály přímo v aplikaci (např. materialy/3roc/hra.html)
  if (/^(\.{0,2}\/|materialy\/|data\/)/i.test(s)) return s;
  return 'https://' + s;
};
