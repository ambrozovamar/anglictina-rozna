// Hlavní soubor: přihlášení, rozvržení stránky, směrování a přehled.
import * as store from './store.js';
import { GRADES, GRADE_IDS, MY_TOOLS } from './curriculum.js';
import { esc, $, $$, fmtDate, relDay, toast, lines, plural } from './util.js';
import * as L from './lessons.js';
import { renderGrade } from './views/grade.js';
import { renderLesson, pending, flushPending } from './views/lesson.js';
import { summary } from './summary.js';
import { renderResources } from './views/resources.js';
import { renderSettings } from './views/settings.js';

const app = $('#app');

// ---------- Přihlášení ----------

function renderLogin(error = '') {
  app.innerHTML = `
    <div class="login-wrap">
      <form class="card login stack" id="login">
        <div class="flags">📘</div>
        <h1>Angličtina Rožná</h1>
        <p class="muted" style="text-align:center">Přípravy hodin pro 2., 3. a 4. ročník</p>
        ${
          store.online
            ? `<label class="field"><span>E-mail</span><input name="email" type="email" autocomplete="username" required></label>
               <label class="field"><span>Heslo</span><input name="password" type="password" autocomplete="current-password" required></label>
               ${error ? `<p class="error">${esc(error)}</p>` : ''}
               <button class="btn primary" style="width:100%;justify-content:center">Přihlásit se</button>
               <button type="button" class="btn ghost sm" id="forgot" style="width:100%;justify-content:center">Zapomenuté heslo</button>`
            : `${store.locked ? `<label class="field"><span>Heslo</span><input name="password" type="password" autocomplete="current-password" required autofocus></label>` : ''}
               ${error ? `<p class="error">${esc(error)}</p>` : ''}
               <button class="btn primary" style="width:100%;justify-content:center">Vstoupit</button>
               <p class="small muted">Offline režim: vaše zápisy se ukládají jen v tomto prohlížeči.
                 Pro sdílení mezi zařízeními je potřeba připojit databázi (návod v README.md).</p>`
        }
      </form>
    </div>`;
  $('#login').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    try {
      await store.signIn(f.get('email'), f.get('password'));
      await start();
    } catch (err) {
      renderLogin(err.message);
    }
  });
  $('#forgot')?.addEventListener('click', async () => {
    const email = $('#login [name=email]').value;
    if (!email) return renderLogin('Nejdřív vyplňte e-mail.');
    try {
      await store.resetPassword(email);
      toast('Odkaz na obnovu hesla je na cestě do e-mailu.');
    } catch (err) {
      renderLogin(err.message);
    }
  });
}

// ---------- Rozvržení ----------

function shell(active) {
  const link = (href, label, key, extra = '') =>
    `<a href="#/${href}" class="${active === key ? 'active' : ''}">${extra}${label}</a>`;
  return `
    <div class="shell">
      <aside class="side">
        <div class="brand">📘 Angličtina Rožná</div>
        <nav class="nav">
          ${link('', '🏠 Přehled', 'home')}
          <div class="nav-sep"></div>
          ${GRADE_IDS.map((g) => link(`rocnik/${g}`, GRADES[g].name, 'g' + g, `<span class="dot" style="background:var(--g${g})"></span>`)).join('')}
          <div class="nav-sep"></div>
          ${link('zdroje', '🔗 Zdroje a nástroje', 'zdroje')}
          ${link('nastaveni', '⚙️ Nastavení', 'nastaveni')}
          <div class="nav-sep"></div>
          <div class="nav-label">Moje nástroje</div>
          ${MY_TOOLS.map((t) => `<a href="${esc(t.url)}" target="_blank" rel="noopener" class="ext">${t.icon} ${esc(t.name)} <span class="muted">↗</span></a>`).join('')}
        </nav>
        <div class="side-foot">
          ${store.online ? '☁️ Firebase' : '💾 Offline režim'}<br>
          <a href="#" id="logout">Odhlásit se</a>
        </div>
      </aside>
      <main class="main" id="view"></main>
    </div>`;
}

// ---------- Přehled ----------

function renderDashboard(view) {
  const cards = GRADE_IDS.map((g) => {
    const G = GRADES[g];
    const slots = L.nextSlots(g, 2);
    const done = L.lastDone(g);
    const carry = done ? [...lines(done.reflection?.notLearned), ...lines(done.reflection?.carryOver)] : [];
    const weak = L.weakVocab(g);
    const missing = L.missingReflection(g);
    const topic = L.currentTopic(g);
    return `
      <section class="card grade-card g${g} stack">
        <div class="row between">
          <h2 style="margin:0"><a href="#/rocnik/${g}" style="color:inherit;text-decoration:none">${G.name}</a></h2>
          <span class="gtag">${G.kids} dětí</span>
        </div>
        <div class="small muted">Téma: <b style="color:var(--text)">${topic ? esc(topic.title) : '—'}</b></div>

        ${missing.length ? `<div class="carry" style="background:#fff4d6;color:#5c3d00">
          ✍️ Doplňte, jak hodina proběhla: ${missing.map((l) => `<a href="#/hodina/${l.id}#reflexe">${fmtDate(l.date)}</a>`).join(', ')}
        </div>` : ''}

        <div>
          ${slots.map((s) => {
            const l = L.lessonOn(g, s.date);
            return `<div class="slot">
              <div class="row between">
                <span class="slot-date">${fmtDate(s.date, { long: true })}</span>
                <span class="small muted">${relDay(s.date)}</span>
              </div>
              <div class="small muted">${esc(s.period)} · ${s.minutes} min · ${esc(s.equipment)}</div>
              <div class="row" style="margin-top:8px">
                ${l
                  ? `<a class="btn sm primary" href="#/hodina/${l.id}">Otevřít přípravu</a>
                     <span class="small muted">${esc(l.title || 'bez názvu')} · ${plural((l.activities || []).length, 'aktivita', 'aktivity', 'aktivit')} · ${L.totalMinutes(l)}/${l.minutes} min</span>`
                  : `<button class="btn sm" data-create="${g}|${s.date}">＋ Připravit hodinu</button>`}
              </div>
            </div>`;
          }).join('')}
        </div>

        <div class="carry">
          <b>Navázat na minulou hodinu</b>${done ? ` <span class="muted small">(${fmtDate(done.date)})</span>` : ''}
          ${carry.length ? `<ul>${carry.map((c) => `<li>${esc(c)}</li>`).join('')}</ul>` : `<div class="small muted">${done ? 'Nic k přenesení.' : 'Zatím žádná odučená hodina.'}</div>`}
          ${weak.length ? `<div class="small" style="margin-top:6px">Opakovat: ${weak.slice(0, 8).map((v) => `<b>${esc(v.term)}</b>`).join(', ')}${weak.length > 8 ? '…' : ''}</div>` : ''}
        </div>
      </section>`;
  }).join('');

  view.innerHTML = `
    <div class="page-head">
      <div><h1>Dobrý den 👋</h1><p class="muted">Nejbližší hodiny a co z minula přenést.</p></div>
    </div>
    <div class="tools-bar">
      ${MY_TOOLS.map((t) => `<a class="tool" href="${esc(t.url)}" target="_blank" rel="noopener" title="${esc(t.note)}">
        <span class="tool-icon">${t.icon}</span><span><b>${esc(t.name)}</b><span class="small muted">${t.grades.map((g) => g + '.').join(' ')} roč.</span></span></a>`).join('')}
    </div>
    <div class="grid grid-3">${cards}</div>`;

  $$('[data-create]', view).forEach((b) =>
    b.addEventListener('click', async () => {
      const [g, date] = b.dataset.create.split('|');
      const l = await L.createLesson(Number(g), date);
      location.hash = `#/hodina/${l.id}`;
    })
  );
}

// ---------- Směrování ----------

async function route() {
  await flushPending(); // rozepsané změny v hodině se uloží před přechodem jinam
  const [path] = location.hash.replace(/^#\/?/, '').split('#');
  const parts = path.split('/').filter(Boolean);
  let active = 'home';
  let render = renderDashboard;

  if (parts[0] === 'rocnik' && GRADES[parts[1]]) {
    active = 'g' + parts[1];
    render = (v) => renderGrade(v, Number(parts[1]), parts[2] || 'hodiny');
  } else if (parts[0] === 'hodina') {
    const l = store.get('lessons', parts[1]);
    if (l) {
      active = 'g' + l.grade;
      render = (v) => renderLesson(v, l.id);
    }
  } else if (parts[0] === 'zdroje') {
    active = 'zdroje';
    render = renderResources;
  } else if (parts[0] === 'nastaveni') {
    active = 'nastaveni';
    render = renderSettings;
  }

  app.innerHTML = shell(active);
  $('#logout').addEventListener('click', async (e) => {
    e.preventDefault();
    await flushPending();
    await store.signOut();
    renderLogin();
  });
  try {
    await render($('#view'));
  } catch (err) {
    console.error(err);
    $('#view').innerHTML = `<div class="card error">Chyba: ${esc(err.message)}</div>`;
  }
  const anchor = location.hash.split('#')[2];
  if (anchor) document.getElementById(anchor)?.scrollIntoView({ behavior: 'smooth' });
  else window.scrollTo(0, 0);
}

async function start() {
  app.innerHTML = '<div class="boot">Načítám data…</div>';
  try {
    await store.loadAll();
  } catch (err) {
    app.innerHTML = `<div class="boot error">${esc(err.message)}<br><a href="#" id="out">Odhlásit se</a></div>`;
    $('#out').addEventListener('click', async (e) => { e.preventDefault(); await store.signOut(); renderLogin(); });
    return;
  }
  // Pro Clauda (čte přehled v přihlášeném prohlížeči): window.ajRozna.summary({ grade, last })
  window.ajRozna = { summary, exportJSON: store.exportJSON, online: store.online };
  if (!routing) {
    window.addEventListener('hashchange', route);
    // Zavírání okna s neuloženými změnami: uložit a prohlížeč se zeptá, jestli odejít.
    window.addEventListener('beforeunload', (e) => {
      if (!pending.size) return;
      flushPending();
      e.preventDefault();
      e.returnValue = '';
    });
    window.addEventListener('visibilitychange', () => { if (document.hidden) flushPending(); });
  }
  routing = true;
  route();
  if (store.migrated) toast(`Data z tohoto prohlížeče (${store.migrated} záznamů) jsou přenesená do databáze.`);
  if (store.online && (await store.preparedLocked())) toast('Připravené hodiny jsou zamčené – odemkněte je v Nastavení.');
}
let routing = false;

(async () => {
  const u = await store.currentUser();
  if (u) start();
  else renderLogin();
})();
