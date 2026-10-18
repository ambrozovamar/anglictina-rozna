// Logika hodin: zakládání, navazování a vyhledávání.
import * as store from './store.js';
import { GRADES, ACTIVITY_TEMPLATES } from './curriculum.js';
import { slotFor, nextSlotAfter, upcomingSlots } from './schedule.js';
import { uid, today, lines } from './util.js';

export const lessonsOf = (grade) =>
  store.byGrade('lessons', grade).sort((a, b) => (a.date || '').localeCompare(b.date || ''));

export const lessonOn = (grade, date) => store.byGrade('lessons', grade).find((l) => l.date === date);

// Poslední hodina před daným datem (odučená i neodučená).
export const lessonBefore = (grade, date) =>
  lessonsOf(grade).filter((l) => l.date < date).pop();

export const lastDone = (grade) => lessonsOf(grade).filter((l) => l.status === 'done').pop();

export const currentTopic = (grade) =>
  store.byGrade('topics', grade).sort((a, b) => a.order - b.order).find((t) => t.status === 'current');

export const topicsOf = (grade) => store.byGrade('topics', grade).sort((a, b) => a.order - b.order);

export const vocabOf = (grade) =>
  store.byGrade('vocab', grade).sort((a, b) => a.term.localeCompare(b.term, 'en'));

export const weakVocab = (grade) => vocabOf(grade).filter((v) => v.status === 'weak');

// Hodiny v minulosti, které ještě nemají vyplněnou reflexi.
export const missingReflection = (grade) =>
  lessonsOf(grade).filter((l) => l.date < today() && l.status !== 'done');

export const tpl = (name) => {
  const t = ACTIVITY_TEMPLATES.find((x) => x.name === name);
  return { id: uid(), name: t.name, minutes: t.minutes, form: t.form, description: t.description, tip: t.tip, basic: '', challenge: '', support: '', url: '' };
};

export const blankActivity = () => ({ id: uid(), name: '', minutes: 5, form: 'lavice', description: '', tip: '', basic: '', challenge: '', support: '', url: '' });

// Založí hodinu na dané datum. Pokud existuje předchozí hodina, naváže na ni:
// převezme téma, „co přenést“ z reflexe a slovíčka, která děti ještě neumí.
export async function createLesson(grade, date) {
  const existing = lessonOn(grade, date);
  if (existing) return existing;

  const slot = slotFor(grade, date) || GRADES[grade].slots[0];
  const prev = lessonBefore(grade, date);
  const topic = prev?.topicId ? store.get('topics', prev.topicId) : currentTopic(grade);

  const lesson = {
    id: uid(),
    grade,
    date,
    period: slot.period,
    minutes: slot.minutes,
    equipment: slot.equipment,
    title: '',
    topicId: topic?.id || '',
    goals: [],
    vocabIds: [],
    activities: [tpl('Hello song / pozdrav')],
    materials: '',
    notes: '',
    status: 'planned',
    reflection: { learned: '', notLearned: '', carryOver: '', behaviour: '' },
    prevId: prev?.id || '',
    visible: false,
  };

  if (prev) {
    const carry = lines(prev.reflection?.carryOver);
    const notLearned = lines(prev.reflection?.notLearned);
    lesson.goals = [...carry];
    // Slovíčka z minulé hodiny, která ještě nejsou „umí“, + všechna označená „opakovat“.
    const ids = new Set(
      (prev.vocabIds || []).filter((id) => store.get('vocab', id) && store.get('vocab', id).status !== 'known')
    );
    weakVocab(grade).forEach((v) => ids.add(v.id));
    lesson.vocabIds = [...ids];
    if (carry.length || notLearned.length || ids.size) {
      const rep = tpl('Opakování z minula');
      const what = [...notLearned, ...carry];
      if (what.length) rep.description = 'Zopakovat: ' + what.join('; ');
      lesson.activities.push(rep);
    }
  }

  if (slot.minutes >= 90) lesson.activities.push(tpl('Pohybová přestávka'));
  lesson.activities.push(tpl('Rozloučení / reflexe'));

  return store.save('lessons', lesson);
}

// Navazující hodina po dané hodině (nejbližší další termín v rozvrhu).
export async function continueLesson(lesson) {
  const next = nextSlotAfter(lesson.grade, lesson.date);
  return createLesson(lesson.grade, next.date);
}

export const nextSlots = (grade, count = 2) => upcomingSlots(grade, today(), count);

export const totalMinutes = (lesson) => (lesson.activities || []).reduce((s, a) => s + (Number(a.minutes) || 0), 0);
