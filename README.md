# Angličtina Rožná – přípravy hodin

Interní webová aplikace pro přípravu navazujících hodin angličtiny pro 2., 3. a 4. ročník.
Aplikace je čisté HTML/CSS/JavaScript, nic se neinstaluje ani nesestavuje.

## Co umí

- **Přehled**: nejbližší pondělní a úterní hodiny každého ročníku podle rozvrhu, upozornění na hodiny bez reflexe a co z minula přenést.
- **Ročník**: časová osa hodin, témata z tematického plánu (aktuální téma se přebírá do nových hodin), banka slovní zásoby se stavy *nové / procvičujeme / opakovat / umí* a zdroje ročníku.
- **Příprava hodiny**:
  - průběh hodiny z aktivit (šablony: Flashcards, Lucky says, I have… Who has…?, Wordwall, Kahoot…)
  - časová lišta
  - forma práce (lavice / tabule / PC / koberec / pohyb)
  - diferenciace (základ / challenge / podpora)
  - pravidla kázně
  - odkazy na zdroje
  - tisk
- **Hlídání podmínek**:
  - upozorní na překročený čas
  - upozorní na chybějící pohyb
  - u dvouhodinovky upozorní na chybějící přestávku
  - ve 2. ročníku upozorní na aktivity delší než 7 minut
- **Reflexe a navazování**: po hodině vyplníte, co se naučili, co nezvládli a co přenést, a ohodnotíte slovíčka. Tlačítko **Navázat další hodinou** založí hodinu na další termín z rozvrhu a převezme do ní:
  - cíle (z „co přenést“)
  - aktivitu „Opakování z minula“
  - slovíčka, která děti ještě neumí
- **Zdroje a nástroje**: knihovna odkazů (Wordwall, Kahoot, Blooket, YouTube, Canva…), připojitelných k aktivitám.
- **Příprava na přístup dětí**: lekce i zdroje mají přepínač „Vidí děti“ a pravidla databáze už počítají s rolemi *teacher / student* (viz `firestore.rules`).

## Vyzkoušení na počítači

```
powershell -ExecutionPolicy Bypass -File serve.ps1
```

a otevřít http://localhost:8080. Bez připojené databáze běží aplikace v **offline režimu** (data jen v prohlížeči, záloha v Nastavení).

## Připojení databáze a přihlášení (Firebase, zdarma – tarif Spark)

1. Na https://console.firebase.google.com založte projekt (Google Analytics není potřeba).
2. **Build → Authentication → Get started → Sign-in method → Email/Password → Enable.**
   V **Settings → User actions** vypněte *Enable create (sign-up)*, aby si účet nemohl založit nikdo cizí.
   V **Settings → Authorized domains** přidejte `ambrozovamar.github.io`.
3. **Authentication → Users → Add user**: zadejte svůj e-mail a heslo. Zkopírujte si *User UID*.
4. **Build → Firestore Database → Create database** (region `eur3` nebo `europe-west3`, režim *production*).
   V záložce **Rules** vložte obsah `firestore.rules` a **Publish**.
   V záložce **Data** založte kolekci `teachers` a v ní dokument s ID = vaše *User UID* (stačí pole `name`).
5. **Project settings → General → Your apps → Web (</>)**: zaregistrujte aplikaci a objekt `firebaseConfig` zkopírujte do `js/config.js` jako `FIREBASE_CONFIG`.
6. Přihlaste se e-mailem a heslem. Data z offline režimu v daném prohlížeči se při prvním přihlášení přenesou do databáze sama.
   V **Nastavení** jednou zadejte heslo webu – připravené hodiny se pak načítají na každém zařízení.

Konfigurace Firebase je veřejná; data chrání přihlášení a pravidla Firestore. Zapisovat smí jen účet z kolekce `teachers`,
každý vidí jen svá data a žák (kolekce `students` s polem `grade`) v budoucnu jen záznamy svého ročníku označené „Vidí děti“.

## Zveřejnění webu

Statický web lze hostovat zdarma:

- **GitHub Pages** (Settings → Pages → Deploy from branch `main`, složka `/`). U soukromého repozitáře vyžaduje placený GitHub účet.
- **Cloudflare Pages / Netlify**: zdarma i ze soukromého repozitáře, stačí propojit s GitHubem; build příkaz žádný, výstupní složka `/`.

Web běží na **GitHub Pages** z veřejného repozitáře: https://ambrozovamar.github.io/anglictina-rozna/

### Heslo webu

Repozitář je veřejný, proto jsou připravené hodiny zašifrované (`data/prepared/*.enc`, AES + PBKDF2).
Bez hesla je nikdo nepřečte, a to ani na webu, ani na GitHubu. Kód aplikace a materiály v `materialy/` (hry, pracovní listy) jsou veřejné.

- Heslo je uložené v `Dokumenty\Anglictina\heslo-webu.txt` a do repozitáře se nedostane.
- Nezašifrované zdroje příprav jsou ve složce `pripravy/`, kterou git ignoruje.
  Po každé úpravě je potřeba spustit `tools\zasifrovat.ps1`.
- **Změna hesla:** přepište `heslo-webu.txt`, spusťte `tools\zasifrovat.ps1` a změny nahrajte na GitHub. Ve všech prohlížečích se pak bude potřeba přihlásit znovu.
- Vaše zápisy z aplikace (reflexe, stavy slovíček) se v offline režimu ukládají jen ve vašem prohlížeči, ne na web.

## Struktura

| Soubor | Obsah |
|---|---|
| `index.html` | vstupní stránka |
| `css/style.css` | vzhled (světlý i tmavý režim, tisk, mobil) |
| `js/config.js` | připojení k Firebase |
| `js/curriculum.js` | ročníky, rozvrh, témata z tematických plánů, šablony aktivit, výchozí nástroje |
| `js/store.js` | ukládání dat (Firebase nebo localStorage) |
| `js/lessons.js` | logika hodin a navazování |
| `js/schedule.js` | výpočet termínů podle rozvrhu |
| `js/views/*.js` | jednotlivé obrazovky |
| `firestore.rules` | přístupová práva k databázi |
