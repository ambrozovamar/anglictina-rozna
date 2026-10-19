// Datová vrstva: stejné rozhraní pro Firebase (online) i localStorage (offline režim).
// Všechna data se po přihlášení načtou do paměti (je jich málo), zápisy jdou rovnou do úložiště.
//
// Každý záznam má tvar { id, grade, visible, ...další pole }.
// Ve Firestore se ukládá jako dokument kolekce lessons / vocab / resources / topics:
//   { owner (uid učitelky), grade, visible, data (mapa ostatních polí), updated_at }
// `visible` = připraveno pro další krok: přístup dětí k vybraným lekcím a zdrojům.
// Profil uživatele: users/{uid} = { keys (klíč k připraveným hodinám), preparedDone [] }.

import { FIREBASE_CONFIG } from './config.js';
import { uid } from './util.js';
import { GRADE_IDS, TOPICS, DEFAULT_RESOURCES } from './curriculum.js';
import { slotFor } from './schedule.js';
import { deriveKeys, decrypt } from './crypto.js';

export const TABLES = ['lessons', 'vocab', 'resources', 'topics'];
const LS_KEY = 'aj-rozna-data-v1';
const LS_SESSION = 'aj-rozna-offline-session';
const LS_KEYS = 'aj-rozna-keys';
const LS_PREPARED = 'aj-rozna-prepared-imported';

export const online = Boolean(FIREBASE_CONFIG);

const cache = Object.fromEntries(TABLES.map((t) => [t, []]));
let user = null;
let profile = {}; // users/{uid} (online)

// ---------- Firebase (načte se jen v online režimu) ----------

const FB = 'https://www.gstatic.com/firebasejs/10.12.2/';
let fb = null;
async function firebase() {
  if (!fb) {
    const [app, auth, fs] = await Promise.all([
      import(FB + 'firebase-app.js'),
      import(FB + 'firebase-auth.js'),
      import(FB + 'firebase-firestore.js'),
    ]);
    const a = app.initializeApp(FIREBASE_CONFIG);
    fb = { auth, fs, authInst: auth.getAuth(a), db: fs.getFirestore(a) };
    fb.authInst.languageCode = 'cs';
  }
  return fb;
}

const AUTH_ERRORS = {
  'auth/invalid-credential': 'Špatný e-mail nebo heslo.',
  'auth/invalid-email': 'Neplatný e-mail.',
  'auth/user-disabled': 'Účet je zablokovaný.',
  'auth/too-many-requests': 'Příliš mnoho pokusů. Zkuste to za chvíli.',
  'auth/network-request-failed': 'Chyba připojení k internetu.',
  'permission-denied': 'K datům nemáte přístup (účet není nastavený jako učitel).',
};
const fbError = (e) => new Error(AUTH_ERRORS[e?.code] || e?.message || String(e));

// ---------- Heslo k připraveným hodinám ----------
// data/prepared/key.json obsahuje sůl a zašifrovanou kontrolu. Ukládají se odvozené klíče, ne heslo:
// offline v prohlížeči, online navíc v profilu učitelky (aby fungovaly na každém zařízení).

export let locked = false; // web má zašifrované připravené hodiny
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

const keys = () => localStorage.getItem(LS_KEYS) || profile.keys || '';

async function keysValid(k) {
  const lock = await siteLock();
  if (!lock) return true;
  if (!k) return false;
  try {
    await decrypt(lock.check, k);
    return true;
  } catch {
    return false;
  }
}

// Online: jsou připravené hodiny odemčené? (jinak se v Nastavení zobrazí pole pro heslo)
export const preparedLocked = async () => locked && !(await keysValid(keys()));

export async function unlockPrepared(password) {
  const lock = await siteLock();
  if (!lock) return;
  const k = await deriveKeys(password, lock.salt, lock.iter);
  if (!(await keysValid(k))) throw new Error('Špatné heslo.');
  localStorage.setItem(LS_KEYS, k);
  if (online) await saveProfile({ keys: k });
  await importPrepared();
}

// ---------- Přihlášení ----------

export async function currentUser() {
  await siteLock();
  if (!online) {
    const ok = localStorage.getItem(LS_SESSION) && (await keysValid(keys()));
    user = ok ? { email: 'offline', offline: true } : null;
    return user;
  }
  const { auth, authInst } = await firebase();
  await authInst.authStateReady();
  const u = authInst.currentUser;
  user = u ? { uid: u.uid, email: u.email } : null;
  if (user) await loadProfile();
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
  const { auth, authInst } = await firebase();
  try {
    await auth.signInWithEmailAndPassword(authInst, email.trim(), password);
  } catch (e) {
    throw fbError(e);
  }
  return currentUser();
}

export async function signOut() {
  if (!online) {
    localStorage.removeItem(LS_SESSION);
    localStorage.removeItem(LS_KEYS);
  } else {
    const { auth, authInst } = await firebase();
    await auth.signOut(authInst);
    localStorage.removeItem(LS_KEYS);
  }
  user = null;
  profile = {};
  TABLES.forEach((t) => (cache[t] = []));
}

export async function resetPassword(email) {
  const { auth, authInst } = await firebase();
  try {
    await auth.sendPasswordResetEmail(authInst, email.trim());
  } catch (e) {
    throw fbError(e);
  }
}

async function loadProfile() {
  const { fs, db } = await firebase();
  try {
    const s = await fs.getDoc(fs.doc(db, 'users', user.uid));
    profile = s.exists() ? s.data() : {};
  } catch {
    profile = {};
  }
}

async function saveProfile(patch) {
  profile = { ...profile, ...patch };
  const { fs, db } = await firebase();
  await fs.setDoc(fs.doc(db, 'users', user.uid), patch, { merge: true });
}

// ---------- Načtení a zápis ----------

// Firestore nepřijímá undefined – projdeme přes JSON.
const clean = (o) => JSON.parse(JSON.stringify(o));
const fromDoc = (id, d) => ({ ...(d.data || {}), id, grade: d.grade ?? null, visible: Boolean(d.visible), updated_at: d.updated_at });
const toDoc = (o) => {
  const { id, grade, visible, updated_at, ...data } = o;
  return { owner: user.uid, grade: grade ?? null, visible: Boolean(visible), data: clean(data), updated_at: updated_at || new Date().toISOString() };
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
    const { fs, db } = await firebase();
    for (const t of TABLES) {
      try {
        const snap = await fs.getDocs(fs.query(fs.collection(db, t), fs.where('owner', '==', user.uid)));
        cache[t] = snap.docs.map((d) => fromDoc(d.id, d.data()));
      } catch (e) {
        throw new Error(`Nepodařilo se načíst ${t}: ${fbError(e).message}`);
      }
    }
    await migrateLocal();
  }
  await seedIfEmpty();
  await importPrepared();
}

// První přihlášení k databázi: data z offline režimu v tomto prohlížeči se přenesou do Firestore.
export let migrated = 0;
async function migrateLocal() {
  const d = readLocal();
  const local = TABLES.reduce((n, t) => n + (d[t]?.length || 0), 0);
  if (!local || cache.topics.length) return;
  // Starší importy připravených hodin nemají updated_at – označíme je jako neupravené.
  const now = new Date().toISOString();
  (d.lessons || []).forEach((l) => { if (!l.updated_at) l.updated_at = l.importedAt = now; });
  for (const t of TABLES) if (d[t]?.length) await saveMany(t, d[t]);
  migrated = local;
  localStorage.setItem(LS_KEY + '-migrated', localStorage.getItem(LS_KEY));
  localStorage.removeItem(LS_KEY);
}

// Připravené hodiny (data/prepared/*.enc) – připravuje je Claude a nahrává do repozitáře.
// Nová hodina se naimportuje jednou a nikdy nepřepíše hodinu, kterou už máte na stejný den.
// Slovíčka se přidají, jen pokud v bance ještě nejsou.
async function importPrepared() {
  if (!(await keysValid(keys()))) return;
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
    done = new Set([...JSON.parse(localStorage.getItem(LS_PREPARED) || '[]'), ...(profile.preparedDone || [])]);
  } catch {
    done = new Set(profile.preparedDone || []);
  }
  const before = done.size;
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
    await applyPrepared(data, done);
  }
  try {
    localStorage.setItem(LS_PREPARED, JSON.stringify([...done]));
  } catch {}
  if (online && done.size !== before) await saveProfile({ preparedDone: [...done] });
}

// Uloží připravené hodiny a slovíčka ({ vocab: [...], lessons: [...] }) – ze souboru nebo přímo od Clauda.
// Existující hodinu přepíše jen novější verze (rev) a jen tehdy, když ji učitelka od importu neupravila
// (updated_at === importedAt). Vrací počet uložených hodin.
export async function applyPrepared(data, done = new Set()) {
  const topicId = (grade, title) => cache.topics.find((t) => t.grade === grade && t.title === title)?.id || '';
  const vocabKey = (grade, term) => `${grade}|${term.trim().toLowerCase()}`;
  const pending = (data.lessons || []).filter((l) => {
    const ex = cache.lessons.find((x) => x.id === l.id);
    if (ex) return (l.rev || 1) > (ex.preparedRev ?? 1) && ex.updated_at === ex.importedAt;
    return !done.has(l.id) && !cache.lessons.some((x) => x.grade === l.grade && x.date === l.date);
  });
  (data.lessons || []).forEach((l) => done.add(l.id));
  if (!pending.length) return 0;

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
      awaitingClaude: false,
      topicId: topicId(l.grade, topicTitle),
      vocabIds: (vocabTerms || []).map((t) => have.get(vocabKey(l.grade, t))).filter(Boolean),
      activities: (l.activities || []).map((a) => ({ id: uid(), ...a })),
    };
  });
  await saveMany('lessons', lessons);
  for (const l of lessons) await closeRequest(l.id);
  return lessons.length;
}

// ---------- Požadavky na přípravu (tlačítko „Navázat další hodinou“) ----------
// Firestore `requests/{lessonId}`: { owner, lessonId, grade, date, prevId, status: 'open'|'done', created, done }

const LS_REQ = 'aj-rozna-requests';
const readReqs = () => {
  try {
    return JSON.parse(localStorage.getItem(LS_REQ) || '{}');
  } catch {
    return {};
  }
};

export async function addRequest(req) {
  if (!online) {
    const all = readReqs();
    all[req.lessonId] = req;
    localStorage.setItem(LS_REQ, JSON.stringify(all));
    return;
  }
  const { fs, db } = await firebase();
  try {
    await fs.setDoc(fs.doc(db, 'requests', req.lessonId), { ...req, owner: user.uid });
  } catch (e) {
    console.warn('Požadavek pro Clauda se neuložil:', fbError(e).message);
  }
}

export async function listRequests(status = 'open') {
  if (!online) return Object.values(readReqs()).filter((r) => !status || r.status === status);
  const { fs, db } = await firebase();
  const snap = await fs.getDocs(fs.query(fs.collection(db, 'requests'), fs.where('owner', '==', user.uid)));
  return snap.docs.map((d) => d.data()).filter((r) => !status || r.status === status);
}

export async function closeRequest(lessonId) {
  const patch = { status: 'done', done: new Date().toISOString() };
  if (!online) {
    const all = readReqs();
    if (all[lessonId]) {
      Object.assign(all[lessonId], patch);
      localStorage.setItem(LS_REQ, JSON.stringify(all));
    }
    return;
  }
  const { fs, db } = await firebase();
  try {
    const ref = fs.doc(db, 'requests', lessonId);
    if ((await fs.getDoc(ref)).exists()) await fs.setDoc(ref, patch, { merge: true });
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
    const { fs, db } = await firebase();
    try {
      await fs.setDoc(fs.doc(db, table, o.id), toDoc(o));
    } catch (e) {
      throw new Error('Uložení selhalo: ' + fbError(e).message);
    }
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
    const { fs, db } = await firebase();
    try {
      for (let k = 0; k < objs.length; k += 400) {
        const b = fs.writeBatch(db);
        objs.slice(k, k + 400).forEach((o) => b.set(fs.doc(db, table, o.id), toDoc(o)));
        await b.commit();
      }
    } catch (e) {
      throw new Error('Uložení selhalo: ' + fbError(e).message);
    }
  }
}

export async function remove(table, id) {
  cache[table] = cache[table].filter((x) => x.id !== id);
  if (!online) writeLocal();
  else {
    const { fs, db } = await firebase();
    try {
      await fs.deleteDoc(fs.doc(db, table, id));
    } catch (e) {
      throw new Error('Smazání selhalo: ' + fbError(e).message);
    }
  }
}

// ---------- Záloha ----------

export const exportJSON = () => JSON.stringify({ app: 'aj-rozna', version: 1, exported: new Date().toISOString(), ...cache }, null, 2);

export async function importJSON(text) {
  const d = JSON.parse(text);
  if (d.app !== 'aj-rozna') throw new Error('Toto není záloha z této aplikace.');
  for (const t of TABLES) if (Array.isArray(d[t])) await saveMany(t, d[t]);
}
