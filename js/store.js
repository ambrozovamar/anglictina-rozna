// Datová vrstva: stejné rozhraní pro Supabase (online) i localStorage (offline režim).
// Všechna data se po přihlášení načtou do paměti (je jich málo), zápisy jdou rovnou do úložiště.
//
// Každý záznam má tvar { id, grade, visible, ...další pole }.
// V databázi se ukládá jako řádek { id, owner, grade, visible_to_students, data (jsonb), updated_at }.
// `visible` = připraveno pro další krok: přístup dětí k vybraným lekcím a zdrojům.

import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';
import { uid } from './util.js';
import { GRADE_IDS, TOPICS, DEFAULT_RESOURCES } from './curriculum.js';
import { slotFor } from './schedule.js';
import { deriveKeys, decrypt } from './crypto.js';

export const TABLES = ['lessons', 'vocab', 'resources', 'topics'];
const LS_KEY = 'aj-rozna-data-v1';
const LS_SESSION = 'aj-rozna-offline-session';

export const online = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

let sb = null; // klient Supabase
const cache = Object.fromEntries(TABLES.map((t) => [t, []]));
let user = null;

async function client() {
  if (!sb) {
    const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm');
    sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return sb;
}

// ---------- Přihlášení ----------

// Heslo webu (offline režim): data/prepared/key.json obsahuje sůl a zašifrovanou kontrolu.
// Bez key.json web heslo nevyžaduje. Do prohlížeče se ukládají odvozené klíče, ne heslo.
const LS_KEYS = 'aj-rozna-keys';
export let locked = false;
let lockInfo;

async function siteLock() {
  if (lockInfo === undefined) {
    try {
      const r = await fetch('data/prepared/key.json', { cache: 'no-store' });
      lockInfo = r.ok ? await r.json() : null;
    } catch {
      lockInfo = null;
    }
    locked = Boolean(lockInfo);
  }
  return lockInfo;
}

const keys = () => localStorage.getItem(LS_KEYS) || '';

async function keysValid(k) {
  const lock = await siteLock();
  if (!lock) return true;
  try {
    await decrypt(lock.check, k);
    return true;
  } catch {
    return false;
  }
}

export async function currentUser() {
  if (!online) {
    await siteLock();
    const ok = localStorage.getItem(LS_SESSION) && (await keysValid(keys()));
    user = ok ? { email: 'offline', offline: true } : null;
    return user;
  }
  const { data } = await (await client()).auth.getSession();
  user = data.session?.user || null;
  return user;
}

export async function signIn(email, password) {
  if (!online) {
    const lock = await siteLock();
    if (lock) {
      if (!password) throw new Error('Zadejte heslo.');
      const k = await deriveKeys(password, lock.salt, lock.iter);
      if (!(await keysValid(k))) throw new Error('Špatné heslo.');
      localStorage.setItem(LS_KEYS, k);
    }
    localStorage.setItem(LS_SESSION, '1');
    return currentUser();
  }
  const { error } = await (await client()).auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message === 'Invalid login credentials' ? 'Špatný e-mail nebo heslo.' : error.message);
  return currentUser();
}

export async function signOut() {
  if (!online) {
    localStorage.removeItem(LS_SESSION);
    localStorage.removeItem(LS_KEYS);
  }
  else await (await client()).auth.signOut();
  user = null;
  TABLES.forEach((t) => (cache[t] = []));
}

export async function resetPassword(email) {
  const { error } = await (await client()).auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname });
  if (error) throw new Error(error.message);
}

// ---------- Načtení a zápis ----------

const fromRow = (r) => ({ ...(r.data || {}), id: r.id, grade: r.grade, visible: r.visible_to_students, updated_at: r.updated_at });
const toRow = (o) => {
  const { id, grade, visible, updated_at, ...data } = o;
  return { id, grade: grade ?? null, visible_to_students: Boolean(visible), data, updated_at: new Date().toISOString() };
};

function readLocal() {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || '{}');
  } catch {
    return {};
  }
}
function writeLocal() {
  localStorage.setItem(LS_KEY, JSON.stringify(cache));
}

export async function loadAll() {
  if (!online) {
    const d = readLocal();
    TABLES.forEach((t) => (cache[t] = d[t] || []));
  } else {
    const c = await client();
    for (const t of TABLES) {
      const { data, error } = await c.from(t).select('*');
      if (error) throw new Error(`Nepodařilo se načíst ${t}: ${error.message}`);
      cache[t] = data.map(fromRow);
    }
  }
  await seedIfEmpty();
  await importPrepared();
}

// Připravené hodiny (data/prepared/*.json) – připravuje je Claude a nahrává do repozitáře.
// Každá hodina se naimportuje jen jednou (pamatuje si to prohlížeč) a nikdy nepřepíše
// hodinu, kterou už máte na stejný den. Slovíčka se přidají, jen pokud v bance ještě nejsou.
const LS_PREPARED = 'aj-rozna-prepared-imported';

async function importPrepared() {
  let files;
  try {
    const r = await fetch('data/prepared/index.json', { cache: 'no-store' });
    if (!r.ok) return;
    files = await r.json();
  } catch {
    return;
  }
  let done;
  try {
    done = new Set(JSON.parse(localStorage.getItem(LS_PREPARED) || '[]'));
  } catch {
    done = new Set();
  }
  const topicId = (grade, title) => cache.topics.find((t) => t.grade === grade && t.title === title)?.id || '';
  const vocabKey = (grade, term) => `${grade}|${term.trim().toLowerCase()}`;

  for (const f of files) {
    let data;
    try {
      const r = await fetch('data/prepared/' + f, { cache: 'no-store' });
      if (!r.ok) continue;
      data = await r.json();
      if (f.endsWith('.enc')) data = JSON.parse(await decrypt(data, keys()));
    } catch {
      continue;
    }
    // Nová hodina se naimportuje jednou. Novější verze (rev) přepíše dřívější import,
    // jen pokud ho učitelka mezitím neupravila (updated_at se nezměnil od importu).
    const pending = (data.lessons || []).filter((l) => {
      const ex = cache.lessons.find((x) => x.id === l.id);
      if (ex) return (l.rev || 1) > (ex.preparedRev || 1) && ex.updated_at === ex.importedAt;
      return !done.has(l.id) && !cache.lessons.some((x) => x.grade === l.grade && x.date === l.date);
    });
    if (!pending.length) {
      (data.lessons || []).forEach((l) => done.add(l.id));
      continue;
    }

    // Slovíčka
    const have = new Map(cache.vocab.map((v) => [vocabKey(v.grade, v.term), v.id]));
    const newVocab = [];
    for (const v of data.vocab || []) {
      const k = vocabKey(v.grade, v.term);
      if (have.has(k)) continue;
      const { topicTitle, ...rest } = v;
      const o = { id: uid(), kind: v.term.trim().includes(' ') ? 'chunk' : 'word', ...rest, topicId: topicId(v.grade, topicTitle) };
      newVocab.push(o);
      have.set(k, o.id);
    }
    await saveMany('vocab', newVocab);

    // Hodiny
    const now = new Date().toISOString();
    const lessons = pending.map((l) => {
      const { topicTitle, vocabTerms, rev, ...rest } = l;
      const slot = slotFor(l.grade, l.date) || {};
      return {
        preparedRev: rev || 1,
        importedAt: now,
        updated_at: now,
        period: slot.period || '',
        minutes: slot.minutes || 45,
        equipment: slot.equipment || '',
        ...rest,
        topicId: topicId(l.grade, topicTitle),
        vocabIds: (vocabTerms || []).map((t) => have.get(vocabKey(l.grade, t))).filter(Boolean),
        activities: (l.activities || []).map((a) => ({ id: uid(), ...a })),
      };
    });
    await saveMany('lessons', lessons);
    (data.lessons || []).forEach((l) => done.add(l.id));
  }
  try {
    localStorage.setItem(LS_PREPARED, JSON.stringify([...done]));
  } catch {}
}

// První spuštění: založí témata z tematických plánů a základní externí nástroje.
async function seedIfEmpty() {
  if (cache.topics.length === 0) {
    // Aktuální téma = poslední téma, které v názvu měsíců obsahuje dnešní měsíc; dřívější jsou probraná.
    const MONTHS = ['leden', 'únor', 'březen', 'duben', 'květen', 'červen', 'červenec', 'srpen', 'září', 'říjen', 'listopad', 'prosinec'];
    const month = MONTHS[new Date().getMonth()];
    const rows = [];
    GRADE_IDS.forEach((g) => {
      const list = TOPICS[g];
      let cur = list.map((t) => t.months.split(/[–-]/).map((m) => m.trim()).includes(month)).lastIndexOf(true);
      if (cur < 0) cur = 0;
      list.forEach((t, i) =>
        rows.push({ id: uid(), grade: g, order: i, status: i < cur ? 'done' : i === cur ? 'current' : 'planned', ...t })
      );
    });
    await saveMany('topics', rows);
  }
  if (cache.resources.length === 0) {
    await saveMany('resources', DEFAULT_RESOURCES.map((r) => ({ id: uid(), grade: null, ...r })));
  }
}

export const all = (table) => cache[table];
export const get = (table, id) => cache[table].find((x) => x.id === id);
export const byGrade = (table, grade) => cache[table].filter((x) => x.grade === grade);

export async function save(table, obj) {
  const o = { ...obj, id: obj.id || uid(), updated_at: new Date().toISOString() };
  const i = cache[table].findIndex((x) => x.id === o.id);
  if (i >= 0) cache[table][i] = o;
  else cache[table].push(o);
  if (!online) writeLocal();
  else {
    const { error } = await (await client()).from(table).upsert(toRow(o));
    if (error) throw new Error('Uložení selhalo: ' + error.message);
  }
  return o;
}

export async function saveMany(table, objs) {
  if (!objs.length) return;
  objs.forEach((o) => {
    o.id = o.id || uid();
    const i = cache[table].findIndex((x) => x.id === o.id);
    if (i >= 0) cache[table][i] = o;
    else cache[table].push(o);
  });
  if (!online) writeLocal();
  else {
    const { error } = await (await client()).from(table).upsert(objs.map(toRow));
    if (error) throw new Error('Uložení selhalo: ' + error.message);
  }
}

export async function remove(table, id) {
  cache[table] = cache[table].filter((x) => x.id !== id);
  if (!online) writeLocal();
  else {
    const { error } = await (await client()).from(table).delete().eq('id', id);
    if (error) throw new Error('Smazání selhalo: ' + error.message);
  }
}

// ---------- Záloha ----------

export const exportJSON = () => JSON.stringify({ app: 'aj-rozna', version: 1, exported: new Date().toISOString(), ...cache }, null, 2);

export async function importJSON(text) {
  const d = JSON.parse(text);
  if (d.app !== 'aj-rozna') throw new Error('Toto není záloha z této aplikace.');
  for (const t of TABLES) if (Array.isArray(d[t])) await saveMany(t, d[t]);
}
