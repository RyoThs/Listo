import { COUNTER_FIREBASE, counterConfig } from './counterConfig';
import { forgetSession, freshSession, readSession, sendPasswordReset, signIn, signUp, storeSession, type Session } from './auth';
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

/** Envoie la sauvegarde si elle a changé. Ne lance jamais d'erreur. */
export async function saveNow(): Promise<SaveResult | null> {
  const c = cfg(); const s = currentAccount();
  if (!c || !s || saving || !navigator.onLine) return null;
  saving = true;
  try {
    const fresh = await freshSession(c, s, localStorage, ACCOUNT_KEY, doFetch);
    lastResult = await saveIfChanged(c, fresh, localStorage, doFetch);
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
  const s = mode === 'signup' ? await signUp(c, email, password, doFetch) : await signIn(c, email, password, doFetch);
  storeSession(localStorage, ACCOUNT_KEY, s);
  try { localStorage.removeItem(LAST_HASH_KEY); } catch { /* rien */ }
  const restored = mode === 'signin' ? await restoreFromCloud(c, s, doFetch) : null;
  tell();
  void saveNow();
  return restored;
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
}
