// Výpočet termínů hodin podle rozvrhu (pondělí / úterý).
import { GRADES } from './curriculum.js';
import { fromISO, toISO, today } from './util.js';

// Najde slot ročníku pro dané datum (podle dne v týdnu).
export function slotFor(grade, iso) {
  const wd = fromISO(iso).getDay();
  return GRADES[grade].slots.find((s) => s.weekday === wd) || null;
}

// Další termíny hodin daného ročníku od data `fromIso` (včetně), `count` kusů.
export function upcomingSlots(grade, fromIso = today(), count = 4) {
  const out = [];
  const d = fromISO(fromIso);
  for (let i = 0; i < 60 && out.length < count; i++) {
    const iso = toISO(d);
    const slot = slotFor(grade, iso);
    if (slot) out.push({ date: iso, ...slot });
    d.setDate(d.getDate() + 1);
  }
  return out;
}

// Termín bezprostředně po datu `afterIso` (bez něj).
export function nextSlotAfter(grade, afterIso) {
  const d = fromISO(afterIso);
  d.setDate(d.getDate() + 1);
  return upcomingSlots(grade, toISO(d), 1)[0];
}
