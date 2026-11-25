import { beforeEach, describe, expect, it, vi } from 'vitest';
import { signUp, sendPasswordReset, signIn } from '../src/lib/auth';
import { snapshotText, hashText, buildUpload, readCloud, MAX_CLOUD_CHARS } from '../src/lib/cloudBackup';
import { saveIfChanged, restoreFromCloud, LAST_HASH_KEY } from '../src/lib/cloudSync';
import { db } from '../src/db/db';
import { createList } from '../src/db/lists';
import { addItem } from '../src/db/items';
import { buildBackup } from '../src/db/backup';

// Compte facultatif + sauvegarde automatique (demande de Yoann, 2026-11-25) :
// la sauvegarde fichier existante est rangée toute seule dans users/{uid}/sauvegarde/derniere (Firestore),
// et récupérée (fusionnée, jamais effacée) à la connexion sur un autre téléphone.

const cfg = { projectId: 'listo-test', apiKey: 'cle-publique' };
const NOW = new Date(2026, 10, 25, 18).getTime();
const session = { uid: 'uid1', email: 'yo@test.fr', idToken: 'jeton', refreshToken: 'r', expiresAt: NOW + 3600_000 };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
type FakeFetch = typeof fetch & { mock: { calls: [string, RequestInit & { body: string; headers: Record<string, string> }][] } };
const mk = (impl: (url: string, init?: RequestInit) => Promise<Response>) => vi.fn(impl) as unknown as FakeFetch;
const DOC = 'https://firestore.googleapis.com/v1/projects/listo-test/databases/(default)/documents/users/uid1/sauvegarde/derniere';

describe('compte', () => {
  it('créer un compte : e-mail + mot de passe, renvoie la session', async () => {
    const f = mk(async () => json({ idToken: 'j', refreshToken: 'r', localId: 'uid9', expiresIn: '3600' }));
    const s = await signUp(cfg, 'a@b.fr', 'secret123', f, NOW);
    expect(f.mock.calls[0][0]).toBe('https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=cle-publique');
    expect(s.uid).toBe('uid9');
  });

  it('messages clairs : e-mail déjà pris, mot de passe trop court, mauvais mot de passe', async () => {
    const err = (m: string) => mk(async () => json({ error: { message: m } }, 400));
    await expect(signUp(cfg, 'a@b.fr', 'x', err('EMAIL_EXISTS'), NOW)).rejects.toThrow('Cet e-mail a déjà un compte : connecte-toi');
    await expect(signUp(cfg, 'a@b.fr', 'x', err('WEAK_PASSWORD : Password should be at least 6 characters'), NOW)).rejects.toThrow('au moins 6 caractères');
    await expect(signIn(cfg, 'a@b.fr', 'x', err('INVALID_LOGIN_CREDENTIALS'), NOW)).rejects.toThrow('E-mail ou mot de passe incorrect');
  });

  it('mot de passe oublié : Firebase envoie l’e-mail', async () => {
    const f = mk(async () => json({ email: 'a@b.fr' }));
    await sendPasswordReset(cfg, 'a@b.fr', f);
    expect(f.mock.calls[0][0]).toBe('https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=cle-publique');
    expect(JSON.parse(f.mock.calls[0][1].body)).toEqual({ requestType: 'PASSWORD_RESET', email: 'a@b.fr' });
  });
});

describe('contenu de la sauvegarde en ligne', () => {
  it('le même contenu que le fichier, sans l’heure (pour savoir si quelque chose a changé)', () => {
    const a = snapshotText({ app: 'listo', format: 1, exportedAt: 1, lists: [] } as never);
    const b = snapshotText({ app: 'listo', format: 1, exportedAt: 2, lists: [] } as never);
    expect(a).toBe(b);
    expect(JSON.parse(a)).toEqual({ app: 'listo', format: 1, lists: [] });
    expect(hashText(a)).toBe(hashText(b));
    expect(hashText(a)).not.toBe(hashText(a + ' '));
  });

  it('envoi : une seule fiche par compte, rangée sous son numéro, avec le jeton', () => {
    const r = buildUpload(cfg, session, '{"app":"listo"}', NOW);
    expect(r.url).toBe(DOC);
    expect(r.init.method).toBe('PATCH');
    expect(r.init.headers).toEqual({ Authorization: 'Bearer jeton', 'Content-Type': 'application/json' });
    expect(JSON.parse(String(r.init.body))).toEqual({ fields: { j: { stringValue: '{"app":"listo"}' }, t: { integerValue: String(NOW) }, v: { integerValue: '1' } } });
  });

  it('lecture : le texte de la sauvegarde, ou rien si le compte n’en a pas encore', async () => {
    expect(await readCloud(cfg, session, mk(async () => json({ fields: { j: { stringValue: '{"a":1}' } } })))).toBe('{"a":1}');
    expect(await readCloud(cfg, session, mk(async () => json({}, 404)))).toBeNull();
    await expect(readCloud(cfg, session, mk(async () => json({}, 403)))).rejects.toThrow();
  });
});

describe('sauvegarde automatique', () => {
  let mem: Map<string, string>;
  const st = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => { mem.set(k, v); }, removeItem: (k: string) => { mem.delete(k); } };
  beforeEach(async () => {
    mem = new Map();
    await Promise.all([db.lists.clear(), db.items.clear(), db.favorites.clear(), db.cards.clear(), db.suggestions.clear(), db.trips.clear(), db.products.clear()]);
  });

  it('envoie quand quelque chose a changé, puis plus rien tant que rien ne change', async () => {
    const list = await createList({ title: 'Courses', color: '#5B8C6E' });
    await addItem(list.id, { name: 'Lait' });
    const f = mk(async () => json({}));
    expect(await saveIfChanged(cfg, session, st, f, NOW)).toBe('sent');
    expect(f.mock.calls).toHaveLength(1);
    expect(f.mock.calls[0][1].body).toContain('Lait');
    expect(await saveIfChanged(cfg, session, st, f, NOW)).toBe('unchanged');
    expect(f.mock.calls).toHaveLength(1);
    await addItem(list.id, { name: 'Pain' });
    expect(await saveIfChanged(cfg, session, st, f, NOW)).toBe('sent');
    expect(f.mock.calls).toHaveLength(2);
  });

  it('panne ou refus : rien n’est noté, on réessaiera', async () => {
    await createList({ title: 'Courses', color: '#5B8C6E' });
    expect(await saveIfChanged(cfg, session, st, mk(async () => json({}, 500)), NOW)).toBe('failed');
    expect(await saveIfChanged(cfg, session, st, mk(async () => { throw new TypeError('réseau'); }), NOW)).toBe('failed');
    expect(mem.has(LAST_HASH_KEY)).toBe(false);
  });

  it('trop gros pour une fiche en ligne : on n’envoie pas et on le dit', async () => {
    const list = await createList({ title: 'Courses', color: '#5B8C6E' });
    await db.items.put({ id: 'x', listId: list.id, name: 'Énorme', note: 'a'.repeat(MAX_CLOUD_CHARS), category: 'other', quantity: 1, isCompleted: false, createdAt: 1, order: 0, updatedAt: 1 });
    const f = mk(async () => json({}));
    expect(await saveIfChanged(cfg, session, st, f, NOW)).toBe('too-big');
    expect(f.mock.calls).toHaveLength(0);
  });

  it('nouveau téléphone : à la connexion, la sauvegarde en ligne revient (fusion, rien d’effacé)', async () => {
    // « ancien téléphone » : une liste avec Lait, envoyée en ligne
    const list = await createList({ title: 'Courses', color: '#5B8C6E' });
    await addItem(list.id, { name: 'Lait' });
    const cloud = snapshotText(await buildBackup());
    // « nouveau téléphone » : vide, avec une liste locale à garder
    await Promise.all([db.lists.clear(), db.items.clear()]);
    const local = await createList({ title: 'Pharmacie', color: '#5B8C6E' });
    await addItem(local.id, { name: 'Doliprane' });
    const f = mk(async () => json({ fields: { j: { stringValue: cloud } } }));
    const r = await restoreFromCloud(cfg, session, f);
    expect(r).toEqual({ lists: 1, items: 1, favorites: 0, cards: 0 });
    const names = (await db.items.toArray()).map((i) => i.name).sort();
    expect(names).toEqual(['Doliprane', 'Lait']);
  });

  it('sauvegarde en ligne abîmée : refusée sans rien toucher (mêmes contrôles que le fichier)', async () => {
    await createList({ title: 'Pharmacie', color: '#5B8C6E' });
    const f = mk(async () => json({ fields: { j: { stringValue: '{"app":"pirate"}' } } }));
    await expect(restoreFromCloud(cfg, session, f)).rejects.toThrow();
    expect(await db.lists.count()).toBe(1);
  });

  it('compte sans sauvegarde en ligne : rien à restaurer', async () => {
    expect(await restoreFromCloud(cfg, session, mk(async () => json({}, 404)))).toBeNull();
  });
});

describe('supprimer mon compte (RGPD, demandé aussi par Apple)', () => {
  it('efface d’abord la sauvegarde en ligne, puis le compte', async () => {
    const { deleteAccountAndData } = await import('../src/lib/cloudSync');
    const f = mk(async () => json({}));
    await deleteAccountAndData(cfg, session, f);
    expect(f.mock.calls[0][0]).toBe(DOC);
    expect(f.mock.calls[0][1].method).toBe('DELETE');
    expect(f.mock.calls[1][0]).toBe('https://identitytoolkit.googleapis.com/v1/accounts:delete?key=cle-publique');
    expect(JSON.parse(f.mock.calls[1][1].body)).toEqual({ idToken: 'jeton' });
  });

  it('si l’effacement de la sauvegarde rate, on ne supprime pas le compte (rien ne reste orphelin)', async () => {
    const { deleteAccountAndData } = await import('../src/lib/cloudSync');
    const f = mk(async () => json({}, 500));
    await expect(deleteAccountAndData(cfg, session, f)).rejects.toThrow();
    expect(f.mock.calls).toHaveLength(1);
  });
});
