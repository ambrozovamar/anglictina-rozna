// Připojení k Firebase (přihlášení + databáze Firestore).
// Hodnoty najdete ve Firebase konzoli: Project settings → General → Your apps → Web app → SDK setup and configuration (Config).
// Tato konfigurace je veřejná a smí být v kódu – data chrání pravidla Firestore (firestore.rules) a přihlášení.
// Dokud je FIREBASE_CONFIG null, aplikace běží v offline režimu (data jen v tomto prohlížeči).

export const FIREBASE_CONFIG = null;
