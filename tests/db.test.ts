import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../src/db/db';
import * as A from '../src/db/actions';

beforeEach(async () => {
  await db.delete();
  await db.open();
});

describe('Base de données', () => {
  it('crée une liste de départ au premier lancement', async () => {
    const lists = await A.getActiveLists();
    expect(lists.map((l) => l.title)).toEqual(['Courses de la semaine']);
  });

  it('ajoute, devine le rayon et fusionne les doublons', async () => {
    const l = await A.createList({ title: 'Test', color: '#000' });
    await A.addItem(l.id, { name: 'pommes', quantity: 2, unit: 'kg' });
    await A.addItem(l.id, { name: 'Pommes', quantity: 1, unit: 'kg' });
    const items = await A.getActiveItems(l.id);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ name: 'Pommes', quantity: 3, unit: 'kg', category: 'produce' });
  });

  it('retient le rayon corrigé pour la prochaine fois', async () => {
    const l = await A.createList({ title: 'Test', color: '#000' });
    const it1 = await A.addItem(l.id, { name: 'Tofu' });
    expect(it1!.category).toBe('other');
    await A.updateItem(it1!.id, { category: 'dairy' });
    await A.deleteItem(it1!.id);
    const it2 = await A.addItem(l.id, { name: 'tofu' });
    expect(it2!.category).toBe('dairy');
  });

  it('suggère les articles déjà tapés', async () => {
    const l = await A.createList({ title: 'Test', color: '#000' });
    await A.addItem(l.id, { name: 'Lait' });
    await A.addItem(l.id, { name: 'Lait' });
    await A.addItem(l.id, { name: 'Lardons' });
    const s = await A.findSuggestions('la');
    expect(s.map((x) => x.name)).toEqual(['Lait', 'Lardons']);
    expect((await A.findSuggestions('la', ['Lait'])).map((x) => x.name)).toEqual(['Lardons']);
  });

  it('coche, décoche, retire les pris et réordonne', async () => {
    const l = await A.createList({ title: 'Test', color: '#000' });
    const a = await A.addItem(l.id, { name: 'A' });
    const b = await A.addItem(l.id, { name: 'B' });
    await A.toggleItem(a!.id);
    expect((await db.items.get(a!.id))!.isCompleted).toBe(true);
    await A.reorderItems([b!.id, a!.id]);
    expect((await db.items.get(b!.id))!.order).toBe(0);
    await A.removeCompleted(l.id);
    expect((await A.getActiveItems(l.id)).map((i) => i.name)).toEqual(['B']);
  });

  it('suppression douce et file d’attente sans doublon', async () => {
    const l = await A.createList({ title: 'Test', color: '#000' });
    const a = await A.addItem(l.id, { name: 'A' });
    await A.updateItem(a!.id, { quantity: 4 });
    expect(await db.syncQueue.where('recordId').equals(a!.id).count()).toBe(1);
    await A.deleteList(l.id);
    expect((await A.getActiveLists()).find((x) => x.id === l.id)).toBeUndefined();
    expect((await db.items.get(a!.id))!.deletedAt).toBeTypeOf('number'); // gardé, marqué supprimé
    expect((await db.syncQueue.where('recordId').equals(a!.id).first())!.action).toBe('delete');
  });
});
