import { describe, expect, it, vi } from 'vitest';
import { sendVerificationEmail, isEmailVerified, readSession, storeSession } from '../src/lib/auth';

// E-mail « Vérifie ton adresse », comme Fluxe Suivi (demande de Yoann, 2026-11-25).
// Envoyé à la création du compte ; la sauvegarde marche sans attendre ; « C'est fait » demande à Google.

const cfg = { projectId: 'listo-test', apiKey: 'cle-publique' };
const session = { uid: 'uid1', email: 'yo@test.fr', idToken: 'jeton', refreshToken: 'r', expiresAt: 1 };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
type FakeFetch = typeof fetch & { mock: { calls: [string, RequestInit & { body: string }][] } };
const mk = (impl: () => Promise<Response>) => vi.fn(impl) as unknown as FakeFetch;

describe('vérification de l’adresse e-mail', () => {
  it('envoie l’e-mail « Vérifie ton adresse » pour ce compte', async () => {
    const f = mk(async () => json({ email: 'yo@test.fr' }));
    await sendVerificationEmail(cfg, session, f);
    expect(f.mock.calls[0][0]).toBe('https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=cle-publique');
    expect(JSON.parse(f.mock.calls[0][1].body)).toEqual({ requestType: 'VERIFY_EMAIL', idToken: 'jeton' });
  });

  it('trop d’envois d’affilée : message clair', async () => {
    const f = mk(async () => json({ error: { message: 'TOO_MANY_ATTEMPTS_TRY_LATER' } }, 400));
    await expect(sendVerificationEmail(cfg, session, f)).rejects.toThrow('Trop d’essais');
  });

  it('« C’est fait » : demande à Google si l’adresse est vérifiée', async () => {
    const yes = mk(async () => json({ users: [{ localId: 'uid1', emailVerified: true }] }));
    expect(await isEmailVerified(cfg, session, yes)).toBe(true);
    expect(yes.mock.calls[0][0]).toBe('https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=cle-publique');
    expect(JSON.parse(yes.mock.calls[0][1].body)).toEqual({ idToken: 'jeton' });
    expect(await isEmailVerified(cfg, session, mk(async () => json({ users: [{ emailVerified: false }] })))).toBe(false);
    expect(await isEmailVerified(cfg, session, mk(async () => json({})))).toBe(false);
  });

  it('la session retient si l’adresse est vérifiée ; les anciennes sessions (sans l’info) restent valables', () => {
    const mem = new Map<string, string>();
    const st = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => { mem.set(k, v); }, removeItem: (k: string) => { mem.delete(k); } };
    storeSession(st, 'k', { ...session, verified: true });
    expect(readSession(st, 'k')?.verified).toBe(true);
    mem.set('k', JSON.stringify(session)); // session de la v0.16 : pas de champ « verified »
    expect(readSession(st, 'k')).toEqual(session);
    mem.set('k', JSON.stringify({ ...session, verified: 'oui' })); // abîmé
    expect(readSession(st, 'k')?.verified).toBeUndefined();
  });
});
