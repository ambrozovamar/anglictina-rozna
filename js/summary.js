// Přehled pro Clauda: všechna data z databáze (hodiny, reflexe, slovíčka, témata) v jednom textu.
// Claude ho čte při přípravě dalších hodin (přes přihlášený prohlížeč: window.ajRozna.summary()),
// učitelka si ho může stáhnout v Nastavení.
import * as store from './store.js';
import { GRADES, GRADE_IDS, FORMS } from './curriculum.js';

const STATUS = { new: 'nové', practice: 'procvičujeme', weak: 'opakovat', known: 'umí' };
const lines = (v) => (Array.isArray(v) ? v : String(v || '').split('\n')).map((s) => String(s).trim()).filter(Boolean);

export function summary({ grade = null, last = 0 } = {}) {
  const out = [`# Angličtina Rožná – přehled pro přípravu hodin`, `Vygenerováno: ${new Date().toLocaleString('cs')}`, ''];
  for (const g of GRADE_IDS) {
    if (grade && g !== grade) continue;
    const G = GRADES[g];
    out.push(`## ${G.name} (${G.kids} dětí; ${G.slots.map((s) => `${['', 'Po', 'Út'][s.weekday]} ${s.period} ${s.minutes} min`).join(', ')})`);

    const topics = store.byGrade('topics', g).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const cur = topics.find((t) => t.status === 'current');
    out.push(`Aktuální téma: ${cur ? cur.title : '—'}`);
    const done = topics.filter((t) => t.status === 'done').map((t) => t.title);
    if (done.length) out.push(`Probraná témata: ${done.join('; ')}`);

    const vocab = store.byGrade('vocab', g);
    for (const st of ['weak', 'practice', 'new', 'known']) {
      const vs = vocab.filter((v) => (v.status || 'new') === st);
      if (vs.length) out.push(`Slovíčka – ${STATUS[st]} (${vs.length}): ${vs.map((v) => v.term).join(', ')}`);
    }
    out.push('');

    let lessons = store.byGrade('lessons', g).sort((a, b) => String(a.date).localeCompare(String(b.date)));
    if (last) lessons = lessons.slice(-last);
    for (const l of lessons) {
      const r = l.reflection || {};
      out.push(`### ${l.date} · ${l.period || ''} · ${l.minutes || ''} min · ${l.status === 'done' ? 'ODUČENO' : 'naplánováno'} – ${l.title || '(bez názvu)'}`);
      const t = l.topicId && store.get('topics', l.topicId);
      if (t) out.push(`Téma: ${t.title}`);
      const goals = lines(l.goals);
      if (goals.length) out.push(`Cíle: ${goals.join(' | ')}`);
      const acts = l.activities || [];
      if (acts.length) out.push(`Aktivity: ${acts.map((a) => `${a.name} (${a.minutes}′, ${FORMS[a.form]?.label || a.form || ''})`).join('; ')}`);
      const vs = (l.vocabIds || []).map((id) => store.get('vocab', id)).filter(Boolean);
      if (vs.length) out.push(`Slovíčka hodiny: ${vs.map((v) => `${v.term} [${STATUS[v.status || 'new']}]`).join(', ')}`);
      if (l.materials) out.push(`Pomůcky: ${l.materials}`);
      if (l.notes) out.push(`Poznámky: ${l.notes}`);
      if (r.learned) out.push(`✅ Zvládli: ${r.learned}`);
      if (r.notLearned) out.push(`⚠️ Nezvládli / nestihli: ${r.notLearned}`);
      if (r.carryOver) out.push(`➜ Přenést: ${lines(r.carryOver).join(' | ')}`);
      if (r.behaviour) out.push(`🙋 Děti, chování: ${r.behaviour}`);
      if (l.status === 'done' && !r.learned && !r.notLearned && !r.carryOver) out.push('(reflexe nevyplněná)');
      out.push(`(id: ${l.id})`, '');
    }
  }
  return out.join('\n');
}

export function downloadSummary() {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([summary()], { type: 'text/markdown;charset=utf-8' }));
  a.download = `aj-rozna-prehled-${new Date().toISOString().slice(0, 10)}.md`;
  a.click();
  URL.revokeObjectURL(a.href);
}
