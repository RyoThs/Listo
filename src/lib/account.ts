import { COUNTER_FIREBASE, counterConfig } from './counterConfig';
import { forgetSession, freshSession, isEmailVerified, readSession, sendPasswordReset, sendVerificationEmail, signIn, signUp, storeSession, type Session } from './auth';
import { deleteAccountAndData, LAST_HASH_KEY, restoreFromCloud, saveIfChanged, type SaveResult } from './cloudSync';
import type { ImportResult } from '../db/backup';
import { useUI } from '../stores/ui';

// Compte facultatif (même projet Firebase que le compteur) : sauvegarde automatique en ligne.
// Sans compte, LISTO marche exactement comme avant.

export const ACCOUNT_KEY = 'listo-compte-v1';
export const ACCOUNT_EVENT = 'listo-compte'; // prévient l'écran quand l'état change
const LAST_SAVE_KEY = 'listo-sauvegarde-en-ligne-date-v1';

const cfg = () => counterConfig(location.hostname) ?? COUNTER_FIREBASE;
const doFetch: typeof fetch = (...a) => fetch(...a);
const tell = () => window.dispatchEvent(new Event(ACCOUNT_EVENT));

export const currentAccount = (): Session | null => readSession(localStorage, ACCOUNT_KEY);
export function lastCloudSave(): number | null {
  try { const n = Number(localStorage.getItem(LAST_SAVE_KEY)); return n > 0 ? n : null; } catch { return null; }
}

let saving = false;
let lastResult: SaveResult | null = null;
export const lastSaveResult = () => lastResult;

/** Envoie la sauvegarde si elle a changé (ou toujours, avec force). Ne lance jamais d'erreur. */
export async function saveNow(force = false): Promise<SaveResult | null> {
  const c = cfg(); const s = currentAccount();
  if (!c || !s) return null;
  if (!navigator.onLine) { lastResult = 'offline'; tell(); return lastResult; }
  if (saving) return null;
  saving = true;
  try {
    const fresh = await freshSession(c, s, localStorage, ACCOUNT_KEY, doFetch);
    lastResult = await saveIfChanged(c, fresh, localStorage, doFetch, Date.now(), { force });
    if (lastResult === 'sent' || lastResult === 'unchanged') {
      try { localStorage.setItem(LAST_SAVE_KEY, String(Date.now())); } catch { /* rien */ }
      useUI.getState().markBackup(); // le rappel « sauvegarde » (point orange) n'a plus lieu d'être
    }
  } catch {
    lastResult = 'failed';
  } finally {
    saving = false;
    tell();
  }
  return lastResult;
}

/** Connexion ou création du compte, puis récupération de la sauvegarde en ligne (fusion) et premier envoi. */
export async function connect(mode: 'signin' | 'signup', email: string, password: string): Promise<ImportResult | null> {
  const c = cfg();
  if (!c) throw new Error('Compte indisponible pour le moment');
  const s: Session = mode === 'signup' ? await signUp(c, email, password, doFetch) : await signIn(c, email, password, doFetch);
  if (mode === 'signup') {
    s.verified = false;
    try { await sendVerificationEmail(c, s, doFetch); } catch { /* pas grave : bouton « Renvoyer l'e-mail » */ }
  } else {
    try { s.verified = await isEmailVerified(c, s, doFetch); } catch { /* on saura plus tard */ }
  }
  storeSession(localStorage, ACCOUNT_KEY, s);
  try { localStorage.removeItem(LAST_HASH_KEY); } catch { /* rien */ }
  const restored = mode === 'signin' ? await restoreFromCloud(c, s, doFetch) : null;
  tell();
  void saveNow();
  return restored;
}

/** Renvoyer l'e-mail « Vérifie ton adresse ». */
export async function resendVerification() {
  const c = cfg(); const s = currentAccount();
  if (!c || !s) return;
  await sendVerificationEmail(c, await freshSession(c, s, localStorage, ACCOUNT_KEY, doFetch), doFetch);
}

/** « C'est fait » : demande à Google ; retient la réponse. */
export async function checkVerified(): Promise<boolean> {
  const c = cfg(); const s = currentAccount();
  if (!c || !s) return false;
  const fresh = await freshSession(c, s, localStorage, ACCOUNT_KEY, doFetch);
  const verified = await isEmailVerified(c, fresh, doFetch);
  storeSession(localStorage, ACCOUNT_KEY, { ...fresh, verified });
  tell();
  return verified;
}

export async function resetPassword(email: string) {
  const c = cfg();
  if (!c) throw new Error('Compte indisponible pour le moment');
  await sendPasswordReset(c, email, doFetch);
}

/** Supprime la sauvegarde en ligne et le compte (les listes du téléphone restent). */
export async function deleteMyAccount() {
  const c = cfg(); const s = currentAccount();
  if (!c || !s) return;
  const fresh = await freshSession(c, s, localStorage, ACCOUNT_KEY, doFetch);
  await deleteAccountAndData(c, fresh, doFetch);
  disconnect();
}

export function disconnect() {
  forgetSession(localStorage, ACCOUNT_KEY);
  try { localStorage.removeItem(LAST_HASH_KEY); localStorage.removeItem(LAST_SAVE_KEY); } catch { /* rien */ }
  tell();
}

/** Tâche de fond : toutes les 20 s (appli ouverte), en quittant l'appli et au retour du réseau. */
export function startCloudBackup() {
  const tick = () => { if (currentAccount()) void saveNow(); };
  setInterval(() => { if (document.visibilityState === 'visible') tick(); }, 20_000);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') tick(); });
  window.addEventListener('online', tick);
  setTimeout(tick, 3000);
  // Compte créé avant la v0.16.2 : on ne sait pas encore si l'adresse est vérifiée → on demande une fois.
  setTimeout(() => { if (currentAccount() && currentAccount()?.verified === undefined && navigator.onLine) void checkVerified().catch(() => {}); }, 4000);
}
