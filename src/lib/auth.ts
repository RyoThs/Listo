import type { CounterConfig } from './counter';

// Comptes Firebase (e-mail + mot de passe), en appels directs sans la bibliothèque Firebase, pour rester léger.
// Sert au compte facultatif (sauvegarde automatique) et à l'écran « Compteur » de Yoann.

export type AuthConfig = CounterConfig;
export interface AdminSession { uid: string; email: string; idToken: string; refreshToken: string; expiresAt: number; verified?: boolean }
export type Session = AdminSession;
type Fetch = typeof fetch;
export type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

const MESSAGES: Record<string, string> = {
  INVALID_LOGIN_CREDENTIALS: 'E-mail ou mot de passe incorrect',
  INVALID_PASSWORD: 'E-mail ou mot de passe incorrect',
  EMAIL_NOT_FOUND: 'E-mail ou mot de passe incorrect',
  INVALID_EMAIL: 'Cet e-mail n’est pas valide',
  MISSING_EMAIL: 'Écris ton e-mail',
  MISSING_PASSWORD: 'Écris ton mot de passe',
  EMAIL_EXISTS: 'Cet e-mail a déjà un compte : connecte-toi',
  WEAK_PASSWORD: 'Mot de passe trop court : au moins 6 caractères',
  USER_DISABLED: 'Ce compte est désactivé',
  OPERATION_NOT_ALLOWED: 'La création de compte est fermée pour le moment',
  ADMIN_ONLY_OPERATION: 'La création de compte est fermée pour le moment',
};
async function errorOf(res: Response, fallback: string) {
  try {
    const code = String((await res.json())?.error?.message ?? '').split(/[ :]/)[0];
    if (code.startsWith('TOO_MANY_ATTEMPTS')) return new Error('Trop d’essais : réessaie dans quelques minutes');
    return new Error(MESSAGES[code] ?? fallback);
  } catch {
    return new Error(fallback);
  }
}

const post = (body: unknown): RequestInit => ({
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(10000),
});
const idUrl = (cfg: AuthConfig, action: string) => `https://identitytoolkit.googleapis.com/v1/accounts:${action}?key=${encodeURIComponent(cfg.apiKey)}`;

async function sessionFrom(res: Response, email: string, now: number, fallback: string): Promise<Session> {
  if (!res.ok) throw await errorOf(res, fallback);
  const d = await res.json();
  return { uid: String(d.localId), email, idToken: String(d.idToken), refreshToken: String(d.refreshToken), expiresAt: now + Number(d.expiresIn || 3600) * 1000 };
}

export async function signIn(cfg: AuthConfig, email: string, password: string, f: Fetch, now = Date.now()): Promise<Session> {
  return sessionFrom(await f(idUrl(cfg, 'signInWithPassword'), post({ email, password, returnSecureToken: true })), email, now, 'Connexion impossible (réseau ?)');
}

export async function signUp(cfg: AuthConfig, email: string, password: string, f: Fetch, now = Date.now()): Promise<Session> {
  return sessionFrom(await f(idUrl(cfg, 'signUp'), post({ email, password, returnSecureToken: true })), email, now, 'Création du compte impossible (réseau ?)');
}

export async function sendPasswordReset(cfg: AuthConfig, email: string, f: Fetch): Promise<void> {
  const res = await f(idUrl(cfg, 'sendOobCode'), post({ requestType: 'PASSWORD_RESET', email }));
  if (!res.ok) throw await errorOf(res, 'Envoi impossible (réseau ?)');
}

/** Le jeton dure 1 h : on le renouvelle s'il lui reste moins d'une minute. */
export const isExpired = (s: Session, now = Date.now()) => s.expiresAt - now < 60_000;

export async function refreshSession(cfg: AuthConfig, s: Session, f: Fetch, now = Date.now()): Promise<Session> {
  const res = await f(`https://securetoken.googleapis.com/v1/token?key=${encodeURIComponent(cfg.apiKey)}`,
    post({ grant_type: 'refresh_token', refresh_token: s.refreshToken }));
  if (!res.ok) throw await errorOf(res, 'Session expirée : reconnecte-toi');
  const d = await res.json();
  return { ...s, idToken: String(d.id_token), refreshToken: String(d.refresh_token), expiresAt: now + Number(d.expires_in || 3600) * 1000 };
}

/** Session valide (renouvelée si besoin et enregistrée), ou erreur. */
export async function freshSession(cfg: AuthConfig, s: Session, st: Store, key: string, f: Fetch, now = Date.now()): Promise<Session> {
  if (!isExpired(s, now)) return s;
  const n = await refreshSession(cfg, s, f, now);
  storeSession(st, key, n);
  return n;
}

export function readSession(st: Store, key: string): Session | null {
  try {
    const s = JSON.parse(st.getItem(key) ?? 'null');
    const ok = s && typeof s.uid === 'string' && typeof s.email === 'string' && typeof s.idToken === 'string'
      && typeof s.refreshToken === 'string' && typeof s.expiresAt === 'number';
    if (!ok) return null;
    if (typeof s.verified !== 'boolean') delete s.verified; // ancienne session ou donnée abîmée : « on ne sait pas »
    return s;
  } catch {
    return null;
  }
}
export function storeSession(st: Store, key: string, s: Session) {
  try { st.setItem(key, JSON.stringify(s)); } catch { /* stockage refusé : il faudra se reconnecter */ }
}
export function forgetSession(st: Store, key: string) {
  try { st.removeItem(key); } catch { /* rien */ }
}

/** Supprime le compte Firebase lui-même (à appeler après avoir effacé ses données). */
export async function deleteAccount(cfg: AuthConfig, s: Session, f: Fetch): Promise<void> {
  const res = await f(idUrl(cfg, 'delete'), post({ idToken: s.idToken }));
  if (!res.ok) throw await errorOf(res, 'Suppression du compte impossible (réseau ?)');
}

/** E-mail « Vérifie ton adresse » (comme Fluxe Suivi). */
export async function sendVerificationEmail(cfg: AuthConfig, s: Session, f: Fetch): Promise<void> {
  const res = await f(idUrl(cfg, 'sendOobCode'), post({ requestType: 'VERIFY_EMAIL', idToken: s.idToken }));
  if (!res.ok) throw await errorOf(res, 'Envoi impossible (réseau ?)');
}

/** Demande à Google si l'adresse de ce compte a été vérifiée (bouton « C'est fait »). */
export async function isEmailVerified(cfg: AuthConfig, s: Session, f: Fetch): Promise<boolean> {
  const res = await f(idUrl(cfg, 'lookup'), post({ idToken: s.idToken }));
  if (!res.ok) throw await errorOf(res, 'Vérification impossible (réseau ?)');
  return (await res.json())?.users?.[0]?.emailVerified === true;
}
