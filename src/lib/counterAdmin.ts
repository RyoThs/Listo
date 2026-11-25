import { cleanTotal, weekOf, type CounterConfig, type CounterTotal } from './counter';

// Écran « Compteur » réservé à Yoann (comme Fluxe Suivi) : connexion Firebase par e-mail et lecture des totaux.
// Sans la bibliothèque Firebase (appels directs), pour que LISTO reste léger.
// Sécurité : ce sont les règles Firestore qui décident ; seul un compte inscrit dans admins/{uid} peut lire.

/** Connexion gardée sur le téléphone de Yoann seulement. Jamais dans la sauvegarde. */
export const SESSION_KEY = 'listo-compteur-admin-v1';

export interface AdminSession { uid: string; email: string; idToken: string; refreshToken: string; expiresAt: number }
export type WeekTotal = CounterTotal & { week: string };
type Fetch = typeof fetch;
type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

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

const MESSAGES: Record<string, string> = {
  INVALID_LOGIN_CREDENTIALS: 'E-mail ou mot de passe incorrect',
  INVALID_PASSWORD: 'E-mail ou mot de passe incorrect',
  EMAIL_NOT_FOUND: 'E-mail ou mot de passe incorrect',
  INVALID_EMAIL: 'E-mail ou mot de passe incorrect',
  USER_DISABLED: 'Ce compte est désactivé',
};
async function errorOf(res: Response, fallback: string) {
  try {
    const code = String((await res.json())?.error?.message ?? '').split(' ')[0];
    if (code.startsWith('TOO_MANY_ATTEMPTS')) return new Error('Trop d’essais : réessaie dans quelques minutes');
    return new Error(MESSAGES[code] ?? fallback);
  } catch {
    return new Error(fallback);
  }
}

const opts = (body: unknown): RequestInit => ({
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(10000),
});

export async function signIn(cfg: CounterConfig, email: string, password: string, f: Fetch, now = Date.now()): Promise<AdminSession> {
  const res = await f(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(cfg.apiKey)}`,
    opts({ email, password, returnSecureToken: true }));
  if (!res.ok) throw await errorOf(res, 'Connexion impossible (réseau ?)');
  const d = await res.json();
  return { uid: String(d.localId), email, idToken: String(d.idToken), refreshToken: String(d.refreshToken), expiresAt: now + Number(d.expiresIn || 3600) * 1000 };
}

/** Le jeton dure 1 h : on le renouvelle s'il lui reste moins d'une minute. */
export const isExpired = (s: AdminSession, now = Date.now()) => s.expiresAt - now < 60_000;

export async function refreshSession(cfg: CounterConfig, s: AdminSession, f: Fetch, now = Date.now()): Promise<AdminSession> {
  const res = await f(`https://securetoken.googleapis.com/v1/token?key=${encodeURIComponent(cfg.apiKey)}`,
    opts({ grant_type: 'refresh_token', refresh_token: s.refreshToken }));
  if (!res.ok) throw await errorOf(res, 'Session expirée : reconnecte-toi');
  const d = await res.json();
  return { ...s, idToken: String(d.id_token), refreshToken: String(d.refresh_token), expiresAt: now + Number(d.expires_in || 3600) * 1000 };
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

export function loadSession(st: Store): AdminSession | null {
  try {
    const s = JSON.parse(st.getItem(SESSION_KEY) ?? 'null');
    const ok = s && typeof s.uid === 'string' && typeof s.email === 'string' && typeof s.idToken === 'string'
      && typeof s.refreshToken === 'string' && typeof s.expiresAt === 'number';
    return ok ? s : null;
  } catch {
    return null;
  }
}
export function saveSession(st: Store, s: AdminSession) {
  try { st.setItem(SESSION_KEY, JSON.stringify(s)); } catch { /* stockage refusé : il faudra se reconnecter */ }
}
export function clearSession(st: Store) {
  try { st.removeItem(SESSION_KEY); } catch { /* rien */ }
}

/** Entrée cachée : vrai au n-ième toucher rapide (tous dans la fenêtre de temps), puis on recommence. */
export function tapCounter(n = 5, windowMs = 3000) {
  let taps: number[] = [];
  return (t: number) => {
    taps = [...taps.filter((x) => t - x < windowMs), t];
    if (taps.length >= n) { taps = []; return true; }
    return false;
  };
}
