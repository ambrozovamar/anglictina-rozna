// Šifrování připravených hodin heslem webu (repozitář je veřejný, data v něm ne).
// Protějšek: tools/zasifrovat.ps1. PBKDF2-SHA256 → 64 B klíče: 32 B AES-CBC + 32 B HMAC-SHA256 (iv ‖ ct).

const enc = new TextEncoder();
const fromB64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const toB64 = (b) => btoa(String.fromCharCode(...b));

// Vrátí odvozené klíče jako base64 (ukládají se v prohlížeči místo hesla).
export async function deriveKeys(password, salt, iterations) {
  const base = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: fromB64(salt), iterations }, base, 512);
  return toB64(new Uint8Array(bits));
}

// blob = { iv, ct, mac } v base64; při špatném klíči vyhodí chybu.
export async function decrypt(blob, keys) {
  const k = fromB64(keys);
  const aesKey = await crypto.subtle.importKey('raw', k.slice(0, 32), 'AES-CBC', false, ['decrypt']);
  const macKey = await crypto.subtle.importKey('raw', k.slice(32), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
  const iv = fromB64(blob.iv);
  const ct = fromB64(blob.ct);
  const signed = new Uint8Array(iv.length + ct.length);
  signed.set(iv);
  signed.set(ct, iv.length);
  if (!(await crypto.subtle.verify('HMAC', macKey, fromB64(blob.mac), signed))) throw new Error('Špatné heslo.');
  return new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-CBC', iv }, aesKey, ct));
}
