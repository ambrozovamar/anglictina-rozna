// Připojení k Firebase (přihlášení + databáze Firestore), projekt anglictina-rozna.
// Hodnoty jsou z Firebase konzole: Project settings → General → Your apps → Web app → Config.
// Tato konfigurace je veřejná a smí být v kódu – data chrání pravidla Firestore (firestore.rules) a přihlášení.
// Kdyby byla FIREBASE_CONFIG null, aplikace poběží v offline režimu (data jen v tomto prohlížeči).

export const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyC0FZRiDxhOU8Bv9oUxUG_MMgvz1U3kH5I',
  authDomain: 'anglictina-rozna.firebaseapp.com',
  projectId: 'anglictina-rozna',
  storageBucket: 'anglictina-rozna.firebasestorage.app',
  messagingSenderId: '210950919317',
  appId: '1:210950919317:web:66ae78396f45237249379c',
};
