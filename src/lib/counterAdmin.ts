import { cleanTotal, weekOf, type CounterConfig, type CounterTotal } from './counter';
import { forgetSession, readSession, storeSession, type AdminSession, type Store } from './auth';

export { signIn, refreshSession, isExpired, type AdminSession } from './auth';

// Écran « Compteur » réservé à Yoann (comme Fluxe Suivi) : connexion Firebase par e-mail et lecture des totaux.
// Sans la bibliothèque Firebase (appels directs), pour que LISTO reste léger.
// Sécurité : ce sont les règles Firestore qui décident ; seul un compte inscrit dans admins/{uid} peut lire.

/** Connexion gardée sur le téléphone de Yoann seulement. Jamais dans la sauvegarde. */
export const SESSION_KEY = 'listo-compteur-admin-v1';

export type WeekTotal = CounterTotal & { week: string };
type Fetch = typeof fetch;

/** Les n dernières semaines (lundis « AAAA-MM-JJ »), de la plus ancienne à celle-ci. */
export function lastWeeks(n: number, now = Date.now()): string[] {
  return Array.from({ length: n }, (_, i) => weekOf(now - (n - 1 - i) * 7 * 864e5));
}

/** Personnes de la semaine = iPhone + Android + autre (« nouveaux » et « installés » en font partie). */
export const totalOf = (t: CounterTotal) => t.ios + t.android + t.autre;

/** Fiche Firestore (format du serveur) → totaux propres. */
export function fromFirestore(doc: unknown): CounterTotal {
  const fields = (doc as { fields?: Record<string, { integerValue?: string }> } | null)?.fields ?? {};
  return cleanTotal(Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, v?.integerValue])));
}

export async function readWeeks(cfg: CounterConfig, idToken: string, weeks: string[], f: Fetch): Promise<WeekTotal[]> {
  const base = `https://firestore.googleapis.com/v1/projects/${cfg.projectId}/databases/(default)/documents/compteur/`;
  const out: WeekTotal[] = [];
  for (const week of weeks) {
    const res = await f(base + week, { headers: { Authorization: `Bearer ${idToken}` }, signal: AbortSignal.timeout(10000) });
    if (res.status === 404) { out.push({ week, ...cleanTotal(null) }); continue; }
    if (res.status === 401 || res.status === 403) throw new Error('Ce compte n’a pas accès au compteur');
    if (!res.ok) throw new Error('Lecture impossible (réseau ?)');
    out.push({ week, ...fromFirestore(await res.json()) });
  }
  return out;
}

export const loadSession = (st: Store) => readSession(st, SESSION_KEY);
export const saveSession = (st: Store, s: AdminSession) => storeSession(st, SESSION_KEY, s);
export const clearSession = (st: Store) => forgetSession(st, SESSION_KEY);

/** Entrée cachée : vrai au n-ième toucher rapide (tous dans la fenêtre de temps), puis on recommence. */
export function tapCounter(n = 5, windowMs = 3000) {
  let taps: number[] = [];
  return (t: number) => {
    taps = [...taps.filter((x) => t - x < windowMs), t];
    if (taps.length >= n) { taps = []; return true; }
    return false;
  };
}
