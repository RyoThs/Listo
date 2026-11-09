import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../src/db/db';
import * as A from '../src/db/actions';

beforeEach(async () => {
  await db.delete();
  await db.open();
});

describe('Listes favorites', () => {
  it('enregistre une liste en favori (articles cochés compris, sans doublon de favori)', async () => {
    const l = await A.createList({ title: 'Semaine', color: '#111', icon: 'basket' });
    const a = await A.addItem(l.id, { name: 'Lait', quantity: 2 });
    await A.addItem(l.id, { name: 'Pommes', quantity: 1, unit: 'kg' });
    await A.updateItem(a!.id, { estimatedPrice: 1.2, isCompleted: true });

    const r1 = await A.saveListAsFavorite(l.id);
    expect(r1!.updated).toBe(false);
    expect(r1!.favorite.items).toEqual([
      { name: 'Lait', category: 'dairy', quantity: 2, unit: undefined, estimatedPrice: 1.2 },
      { name: 'Pommes', category: 'produce', quantity: 1, unit: 'kg', estimatedPrice: undefined },
    ]);

    await A.addItem(l.id, { name: 'Pain' });
    const r2 = await A.saveListAsFavorite(l.id);
    expect(r2!.updated).toBe(true);
    const favs = await A.getActiveFavorites();
    expect(favs).toHaveLength(1);
    expect(favs[0].items.map((i) => i.name)).toEqual(['Lait', 'Pommes', 'Pain']);
  });

  it('crée une nouvelle liste toute prête (rien de coché, prix repris)', async () => {
    const l = await A.createList({ title: 'Semaine', color: '#123', icon: 'gift' });
    const a = await A.addItem(l.id, { name: 'Lait' });
    await A.updateItem(a!.id, { estimatedPrice: 1.2, isCompleted: true });
    const { favorite } = (await A.saveListAsFavorite(l.id))!;

    const created = await A.createListFromFavorite(favorite.id);
    expect(created).toMatchObject({ title: 'Semaine', color: '#123', icon: 'gift' });
    const items = await A.getActiveItems(created!.id);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ name: 'Lait', isCompleted: false, estimatedPrice: 1.2 });
  });

  it('verse un favori dans une liste sans créer de doublon', async () => {
    const src = await A.createList({ title: 'Base', color: '#000' });
    await A.addItem(src.id, { name: 'Lait', quantity: 2 });
    await A.addItem(src.id, { name: 'Œufs', quantity: 6 });
    const { favorite } = (await A.saveListAsFavorite(src.id))!;

    const target = await A.createList({ title: 'Cible', color: '#000' });
    await A.addItem(target.id, { name: 'lait', quantity: 1 });
    expect(await A.addFavoriteToList(favorite.id, target.id)).toBe(2);
    const items = await A.getActiveItems(target.id);
    expect(items.map((i) => [i.name, i.quantity]).sort()).toEqual([['Lait', 3], ['Œufs', 6]]);
  });

  it('supprime un favori (effacement doux, noté pour la synchro)', async () => {
    const l = await A.createList({ title: 'X', color: '#000' });
    await A.addItem(l.id, { name: 'Riz' });
    const { favorite } = (await A.saveListAsFavorite(l.id))!;
    await A.deleteFavorite(favorite.id);
    expect(await A.getActiveFavorites()).toHaveLength(0);
    expect(await A.getFavoriteForList(l.id)).toBeUndefined();
    expect((await db.syncQueue.where('recordId').equals(favorite.id).first())!.action).toBe('delete');
    expect(await A.createListFromFavorite(favorite.id)).toBeUndefined();
  });
});
