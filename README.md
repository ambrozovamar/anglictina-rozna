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
- **Příprava na přístup dětí**: lekce i zdroje mají přepínač „Vidí děti“ a databáze už má role *teacher / student* (viz `supabase/schema.sql`).

## Vyzkoušení na počítači

```
powershell -ExecutionPolicy Bypass -File serve.ps1
```

a otevřít http://localhost:8080. Bez připojené databáze běží aplikace v **offline režimu** (data jen v prohlížeči, záloha v Nastavení).

## Připojení databáze a přihlášení (Supabase, zdarma)

1. Na https://supabase.com si založte účet a nový projekt (region EU, např. Frankfurt).
2. V projektu otevřete **SQL Editor → New query**, vložte celý obsah `supabase/schema.sql` a klikněte na **Run**.
3. **Authentication → Users → Add user → Create new user**: zadejte svůj e-mail a heslo (zaškrtněte *Auto Confirm User*).
4. **Authentication → Sign In / Providers**: vypněte *Allow new users to sign up*, aby si účet nemohl založit nikdo cizí.
5. **Project Settings → API**: zkopírujte *Project URL* a *anon public* klíč do `js/config.js`.
6. Pokud jste už pracovala v offline režimu: v Nastavení stáhněte zálohu, po připojení se přihlaste a zálohu nahrajte.

Anon klíč je veřejný; data chrání pravidla Row Level Security. Každý učitel vidí jen svá data, žák v budoucnu jen to, co je označené „Vidí děti“ pro jeho ročník.

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
| `js/config.js` | připojení k Supabase |
| `js/curriculum.js` | ročníky, rozvrh, témata z tematických plánů, šablony aktivit, výchozí nástroje |
| `js/store.js` | ukládání dat (Supabase nebo localStorage) |
| `js/lessons.js` | logika hodin a navazování |
| `js/schedule.js` | výpočet termínů podle rozvrhu |
| `js/views/*.js` | jednotlivé obrazovky |
| `supabase/schema.sql` | databáze a přístupová práva |
