import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../src/db/db';
import * as A from '../src/db/actions';
import { cleanNote } from '../src/lib/note';
import { parseEntry, splitEntries } from '../src/lib/parse';
import { buildBackup, importBackup, parseBackup } from '../src/db/backup';
import { buildListLink, readListLink } from '../src/lib/listLink';
import { buildListText } from '../src/lib/shareText';

beforeEach(async () => {
  await db.delete();
  await db.open();
});
const newList = () => A.createList({ title: 'Test', color: '#000' });

describe('Note sur un article : nettoyage', () => {
  it('enlève les espaces en trop et raccourcit à 80 caractères', () => {
    expect(cleanNote('  bio   demi-écrémé ')).toBe('bio demi-écrémé');
    expect(cleanNote('x'.repeat(200))).toHaveLength(80);
  });
  it('vide ou pas du texte → pas de note', () => {
    expect(cleanNote('   ')).toBeUndefined();
    expect(cleanNote(42)).toBeUndefined();
    expect(cleanNote(undefined)).toBeUndefined();
  });
});

describe('Note sur un article : saisie « lait (bio) »', () => {
  it('le texte entre parenthèses devient la note', () => {
    expect(parseEntry('lait (bio)')).toEqual({ name: 'Lait', quantity: 1, unit: undefined, note: 'bio' });
    expect(parseEntry('2 kg de pommes (les rouges)')).toEqual({ name: 'Pommes', quantity: 2, unit: 'kg', note: 'les rouges' });
  });
  it('sans parenthèses : pas de note', () => {
    expect(parseEntry('du pain').note).toBeUndefined();
  });
  it('parenthèses vides : pas de note, et le nom reste propre', () => {
    expect(parseEntry('café ()')).toMatchObject({ name: 'Café', note: undefined });
  });
  it('une virgule DANS la note ne coupe pas l’article en deux', () => {
    expect(splitEntries('lait (bio, demi-écrémé), pain')).toEqual(['lait (bio, demi-écrémé)', 'pain']);
  });
});

describe('Note sur un article : dans la liste', () => {
  it('ajout avec note, puis modification et effacement', async () => {
    const l = await newList();
    const lait = await A.addItem(l.id, { name: 'Lait', note: 'bio' });
    expect(lait!.note).toBe('bio');
    await A.updateItem(lait!.id, { note: 'marque Lactel' });
    expect((await db.items.get(lait!.id))!.note).toBe('marque Lactel');
    await A.updateItem(lait!.id, { note: undefined });
    expect((await db.items.get(lait!.id))!.note).toBeUndefined();
  });
  it('doublon : la note existante est gardée, sinon la nouvelle est prise', async () => {
    const l = await newList();
    const a = await A.addItem(l.id, { name: 'Lait', note: 'bio' });
    await A.addItem(l.id, { name: 'lait', note: 'entier' });
    expect((await db.items.get(a!.id))!.note).toBe('bio');
    const b = await A.addItem(l.id, { name: 'Pain' });
    await A.addItem(l.id, { name: 'pain', note: 'aux céréales' });
    expect((await db.items.get(b!.id))!.note).toBe('aux céréales');
  });
});

describe('Note sur un article : elle suit l’article partout', () => {
  it('sauvegarde → restauration', async () => {
    const l = await newList();
    await A.addItem(l.id, { name: 'Lait', note: 'bio' });
    const text = JSON.stringify(await buildBackup());
    await db.delete(); await db.open();
    await importBackup(parseBackup(text));
    const items = await db.items.toArray();
    expect(items.find((i) => i.name === 'Lait')!.note).toBe('bio');
  });
  it('une note abîmée dans un fichier importé est nettoyée', async () => {
    const backup = JSON.parse(JSON.stringify(await buildBackup()));
    backup.lists = [{ id: 'L1', title: 'Liste' }];
    backup.items = [{ id: 'I1', listId: 'L1', name: 'Lait', note: { piege: true } }, { id: 'I2', listId: 'L1', name: 'Pain', note: 'y'.repeat(500) }];
    await importBackup(parseBackup(JSON.stringify(backup)));
    expect((await db.items.get('I1'))!.note).toBeUndefined();
    expect((await db.items.get('I2'))!.note).toHaveLength(80);
  });
  it('favori : la note est gardée et revient dans la nouvelle liste', async () => {
    const l = await newList();
    await A.addItem(l.id, { name: 'Lait', note: 'bio' });
    const { favorite } = (await A.saveListAsFavorite(l.id))!;
    expect(favorite.items[0].note).toBe('bio');
    const l2 = await A.createListFromFavorite(favorite.id);
    expect((await A.getActiveItems(l2!.id))[0].note).toBe('bio');
  });
  it('liste envoyée par message : la note est dans le texte et dans le lien', async () => {
    const l = await newList();
    await A.addItem(l.id, { name: 'Lait', quantity: 2, unit: 'L', note: 'bio' });
    const items = await A.getActiveItems(l.id);
    expect(buildListText('Test', items)).toContain('• Lait (2 L) – bio');
    const shared = readListLink(buildListLink(l, items, 'https://x.test/'))!;
    expect(shared.items[0]).toMatchObject({ name: 'Lait', note: 'bio' });
    const created = await A.createListFromShared(shared);
    expect((await A.getActiveItems(created.id))[0].note).toBe('bio');
  });
  it('nouveau pack tapé « lait (bio), pain » : la note est gardée', async () => {
    const pack = await A.createPack('Petit-déj', 'lait (bio), pain');
    expect(pack.items.map((i) => [i.name, i.note])).toEqual([['Lait', 'bio'], ['Pain', undefined]]);
  });
  it('un ancien lien (sans note) se lit toujours', () => {
    const old = 'https://x.test/#liste=' + btoa(JSON.stringify({ v: 1, t: 'Vieux', a: [['Pain', 1, '', 'bakery']] }));
    expect(readListLink(old)!.items[0]).toMatchObject({ name: 'Pain', note: undefined });
  });
});
