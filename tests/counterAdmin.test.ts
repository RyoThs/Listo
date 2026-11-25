import { describe, expect, it, vi } from 'vitest';
import {
  lastWeeks, totalOf, fromFirestore, signIn, refreshSession, readWeeks, isExpired, SESSION_KEY,
  loadSession, saveSession, clearSession, tapCounter,
} from '../src/lib/counterAdmin';

// Écran « Compteur » réservé à Yoann (comme Fluxe Suivi) : connexion Firebase par e-mail,
// lecture des 8 dernières semaines. Seul un compte inscrit dans admins/{uid} peut lire (règles Firestore).

const cfg = { projectId: 'listo-test', apiKey: 'cle-publique' };
const MERCREDI = new Date(2026, 10, 25, 18).getTime();
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
type FakeFetch = typeof fetch & { mock: { calls: [string, RequestInit & { body: string; headers: unknown }][] } };
const mk = (impl: (url: string) => Promise<Response>) => vi.fn(impl) as unknown as FakeFetch;

describe('semaines affichées', () => {
  it('les 8 dernières semaines (lundis), de la plus ancienne à celle-ci', () => {
    const w = lastWeeks(8, MERCREDI);
    expect(w).toHaveLength(8);
    expect(w[7]).toBe('2026-11-23');
    expect(w[6]).toBe('2026-11-16');
    expect(w[0]).toBe('2026-10-05');
  });
});

describe('lecture d’une fiche Firestore', () => {
  it('transforme les champs du serveur en nombres propres', () => {
    const doc = { fields: { ios: { integerValue: '3' }, android: { integerValue: '2' }, installes: { integerValue: '4' }, pirate: { stringValue: 'x' } } };
    expect(fromFirestore(doc)).toEqual({ ios: 3, android: 2, autre: 0, nouveaux: 0, installes: 4 });
    expect(fromFirestore(null)).toEqual({ ios: 0, android: 0, autre: 0, nouveaux: 0, installes: 0 });
    expect(fromFirestore({ fields: { ios: { integerValue: '-7' } } }).ios).toBe(0);
  });

  it('total = iPhone + Android + autre (nouveaux et installés sont « dont »)', () => {
    expect(totalOf({ ios: 3, android: 2, autre: 1, nouveaux: 4, installes: 5 })).toBe(6);
  });
});

describe('connexion', () => {
  it('connexion par e-mail : garde le compte, le jeton et sa date de fin', async () => {
    const f = mk(async () => json({ idToken: 'jeton', refreshToken: 'renouvellement', localId: 'uid1', expiresIn: '3600' }));
    const s = await signIn(cfg, 'yo@test.fr', 'motdepasse', f, MERCREDI);
    expect(f.mock.calls[0][0]).toBe('https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=cle-publique');
    expect(JSON.parse(f.mock.calls[0][1].body)).toEqual({ email: 'yo@test.fr', password: 'motdepasse', returnSecureToken: true });
    expect(s).toEqual({ uid: 'uid1', email: 'yo@test.fr', idToken: 'jeton', refreshToken: 'renouvellement', expiresAt: MERCREDI + 3600_000 });
  });

  it('mauvais mot de passe : message clair', async () => {
    const f = mk(async () => json({ error: { message: 'INVALID_LOGIN_CREDENTIALS' } }, 400));
    await expect(signIn(cfg, 'yo@test.fr', 'faux', f, MERCREDI)).rejects.toThrow('E-mail ou mot de passe incorrect');
  });

  it('jeton bientôt fini → renouvelé sans redemander le mot de passe', async () => {
    const s = { uid: 'uid1', email: 'yo@test.fr', idToken: 'vieux', refreshToken: 'r1', expiresAt: MERCREDI + 30_000 };
    expect(isExpired(s, MERCREDI)).toBe(true); // moins d'une minute : on renouvelle
    expect(isExpired({ ...s, expiresAt: MERCREDI + 600_000 }, MERCREDI)).toBe(false);
    const f = mk(async () => json({ id_token: 'neuf', refresh_token: 'r2', user_id: 'uid1', expires_in: '3600' }));
    const n = await refreshSession(cfg, s, f, MERCREDI);
    expect(f.mock.calls[0][0]).toBe('https://securetoken.googleapis.com/v1/token?key=cle-publique');
    expect(n).toEqual({ ...s, idToken: 'neuf', refreshToken: 'r2', expiresAt: MERCREDI + 3600_000 });
  });
});

describe('lecture des 8 semaines', () => {
  it('une lecture par semaine avec le jeton ; semaine absente = 0', async () => {
    const f = mk(async (url: string) => (url.endsWith('/compteur/2026-11-23')
      ? json({ fields: { ios: { integerValue: '5' }, nouveaux: { integerValue: '2' } } })
      : json({ error: { status: 'NOT_FOUND' } }, 404)));
    const weeks = await readWeeks(cfg, 'jeton', ['2026-11-16', '2026-11-23'], f);
    expect(f.mock.calls[1][0]).toBe('https://firestore.googleapis.com/v1/projects/listo-test/databases/(default)/documents/compteur/2026-11-23');
    expect(f.mock.calls[1][1].headers).toEqual({ Authorization: 'Bearer jeton' });
    expect(weeks).toEqual([
      { week: '2026-11-16', ios: 0, android: 0, autre: 0, nouveaux: 0, installes: 0 },
      { week: '2026-11-23', ios: 5, android: 0, autre: 0, nouveaux: 2, installes: 0 },
    ]);
  });

  it('compte sans droit (pas dans admins) : message clair', async () => {
    const f = mk(async () => json({ error: { status: 'PERMISSION_DENIED' } }, 403));
    await expect(readWeeks(cfg, 'jeton', ['2026-11-23'], f)).rejects.toThrow('Ce compte n’a pas accès au compteur');
  });
});

describe('session gardée sur le téléphone', () => {
  it('enregistrée, relue, effacée ; donnée abîmée ou stockage refusé = pas connecté', () => {
    const mem = new Map<string, string>();
    const st = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => { mem.set(k, v); }, removeItem: (k: string) => { mem.delete(k); } };
    const s = { uid: 'uid1', email: 'yo@test.fr', idToken: 'j', refreshToken: 'r', expiresAt: 1 };
    saveSession(st, s);
    expect(loadSession(st)).toEqual(s);
    mem.set(SESSION_KEY, '{abîmé');
    expect(loadSession(st)).toBeNull();
    mem.set(SESSION_KEY, JSON.stringify({ uid: 3 }));
    expect(loadSession(st)).toBeNull();
    clearSession(st);
    expect(mem.has(SESSION_KEY)).toBe(false);
    const refus = { getItem: () => { throw new Error('refusé'); }, setItem: () => { throw new Error('refusé'); }, removeItem: () => {} };
    expect(loadSession(refus)).toBeNull();
    expect(() => saveSession(refus, s)).not.toThrow();
  });
});

describe('entrée cachée : 5 touchers rapides sur le numéro de version', () => {
  it('ouvre au 5e toucher en moins de 3 secondes, sinon on recommence', () => {
    const tap = tapCounter(5, 3000);
    expect([0, 300, 600, 900].map((t) => tap(t))).toEqual([false, false, false, false]);
    expect(tap(1200)).toBe(true);
    expect(tap(1500)).toBe(false); // on repart de zéro
    const lent = tapCounter(5, 3000);
    expect([0, 1000, 2000, 3000, 4000].map((t) => lent(t)).some(Boolean)).toBe(false);
  });
});
