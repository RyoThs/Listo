import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../src/db/db';
import * as A from '../src/db/actions';
import { addedMessage } from '../src/lib/addedMessage';
import { summarizeTrip, formatDuration, spentThisMonth } from '../src/lib/tripSummary';
import { buildBackup, importBackup, parseBackup } from '../src/db/backup';

beforeEach(async () => {
  await db.delete();
  await db.open();
});

const newList = () => A.createList({ title: 'Test', color: '#000' });

describe('« Déjà dans la liste »', () => {
  it('un doublon augmente la quantité et le message le dit', async () => {
    const l = await newList();
    const first = await A.addItem(l.id, { name: 'Lait' });
    expect(addedMessage(first!)).toBe('Lait ajouté');
    const again = await A.addItem(l.id, { name: 'lait' });
    expect(again!.merged).toBe(true);
    expect(addedMessage(again!)).toBe('Lait était déjà dans la liste → ×2');
    expect(await A.getActiveItems(l.id)).toHaveLength(1);
  });
});

describe('Mémoire des prix', () => {
  it('retient le prix payé et le pré-remplit la fois suivante, pour la bonne quantité', async () => {
    const l = await newList();
    const lait = await A.addItem(l.id, { name: 'Lait', quantity: 2 });
    expect(lait!.estimatedPrice).toBeUndefined();
    await A.updateItem(lait!.id, { estimatedPrice: 2.4 }); // 1,20 € l'unité
    await A.deleteItem(lait!.id);
    const encore = await A.addItem(l.id, { name: 'lait', quantity: 3 });
    expect(encore!.estimatedPrice).toBe(3.6);
  });

  it('le prix suit la quantité (+/−, doublon)', async () => {
    const l = await newList();
    const it1 = await A.addItem(l.id, { name: 'Yaourts' });
    await A.updateItem(it1!.id, { estimatedPrice: 1.5 });
    await A.updateItem(it1!.id, { quantity: 3 });
    expect((await db.items.get(it1!.id))!.estimatedPrice).toBe(4.5);
    await A.addItem(l.id, { name: 'yaourts' }); // doublon → 4
    expect((await db.items.get(it1!.id))!).toMatchObject({ quantity: 4, estimatedPrice: 6 });
  });

  it('un nouveau prix donné en même temps que la quantité gagne', async () => {
    const l = await newList();
    const it1 = await A.addItem(l.id, { name: 'Pain' });
    await A.updateItem(it1!.id, { estimatedPrice: 1 });
    await A.updateItem(it1!.id, { quantity: 2, estimatedPrice: 1.8 });
    expect((await db.items.get(it1!.id))!.estimatedPrice).toBe(1.8);
  });

  it('un prix au kg ne sert pas pour des pièces', async () => {
    const l = await newList();
    const p = await A.addItem(l.id, { name: 'Pommes', quantity: 2, unit: 'kg' });
    await A.updateItem(p!.id, { estimatedPrice: 5 });
    await A.deleteItem(p!.id);
    expect((await A.addItem(l.id, { name: 'Pommes', quantity: 2, unit: 'kg' }))!.estimatedPrice).toBe(5);
    const autre = await newList(); // (dans la même liste, il fusionnerait avec les pommes au kg)
    expect((await A.addItem(autre.id, { name: 'Pommes', quantity: 4 }))!.estimatedPrice).toBeUndefined();
  });
});

describe('Bilan des courses', () => {
  const item = (o: Partial<import('../src/types').ShoppingItem>) => ({
    id: o.name!, listId: 'L', category: 'other', quantity: 1, isCompleted: false, createdAt: 0, updatedAt: 0, order: 0, ...o,
  }) as import('../src/types').ShoppingItem;

  it('compte les pris, liste les oubliés, additionne le panier', () => {
    const s = summarizeTrip({ id: 'L', title: 'Courses' }, [
      item({ name: 'Lait', isCompleted: true, updatedAt: 2000, estimatedPrice: 1.2 }),
      item({ name: 'Pain', isCompleted: true, updatedAt: 2500 }),
      item({ name: 'Café' }),
      item({ name: 'Supprimé', deletedAt: 5, isCompleted: true, estimatedPrice: 99 }),
    ], 1000, 1000 + 18 * 60000);
    expect(s).toMatchObject({ taken: 2, forgotten: ['Café'], spent: 1.2, happened: true, listTitle: 'Courses' });
    expect(formatDuration(s.endedAt - s.startedAt)).toBe('18 min');
  });

  it('pas de bilan si rien n’a été coché pendant ces courses', () => {
    const s = summarizeTrip({ id: 'L', title: 'C' }, [item({ name: 'Lait', isCompleted: true, updatedAt: 10 })], 1000, 2000);
    expect(s.happened).toBe(false);
  });

  it('durées et total du mois', () => {
    expect(formatDuration(20_000)).toBe('< 1 min');
    expect(formatDuration(65 * 60000)).toBe('1 h 05');
    const today = new Date(2026, 10, 18);
    expect(spentThisMonth([
      { endedAt: new Date(2026, 10, 2).getTime(), spent: 40.1 },
      { endedAt: new Date(2026, 10, 10).getTime(), spent: 20.2 },
      { endedAt: new Date(2026, 10, 12).getTime() },
      { endedAt: new Date(2026, 9, 30).getTime(), spent: 500 },
    ], today)).toBe(60.3);
    expect(spentThisMonth([], today)).toBeUndefined();
  });

  it('l’historique garde les plus récents et entre dans la sauvegarde', async () => {
    for (let i = 0; i < A.MAX_TRIPS + 3; i++) {
      await A.saveTrip({ listId: 'L', listTitle: `C${i}`, startedAt: i, endedAt: i, taken: 1, forgotten: [] });
    }
    expect(await db.trips.count()).toBe(A.MAX_TRIPS);
    expect((await A.getRecentTrips(1))[0].listTitle).toBe(`C${A.MAX_TRIPS + 2}`);

    const backup = JSON.stringify(await buildBackup());
    await db.delete(); await db.open();
    await importBackup(parseBackup(backup));
    await importBackup(parseBackup(backup)); // deux fois : pas de doublon
    expect(await db.trips.count()).toBe(A.MAX_TRIPS);
  });
});

describe('Produits scannés', () => {
  it('ajoute le produit et retient son nom pour ce code-barres', async () => {
    const l = await newList();
    const item = await A.addScannedProduct(l.id, '3017620422003', 'pâte à tartiner');
    expect(item!.name).toBe('Pâte à tartiner');
    expect(await A.getKnownProduct('3017620422003')).toMatchObject({ name: 'Pâte à tartiner' });
    const again = await A.addScannedProduct(l.id, '3017620422003', 'Pâte à tartiner');
    expect(again!.merged).toBe(true);
  });

  it('une sauvegarde trafiquée est nettoyée', () => {
    const b = parseBackup(JSON.stringify({
      app: 'listo', format: 1, lists: [], items: [], favorites: [],
      suggestions: [{ key: 'lait', name: 'Lait', unitPrice: -3 }, { key: 'pain', name: 'Pain', unitPrice: 1.1, priceUnit: 'bidon' }],
      trips: [{ id: 'T', endedAt: 5, taken: -2, forgotten: ['ok', 42, 'x'.repeat(500)] }, { id: 'sans date' }],
      products: [{ code: '123', name: 'Trop court' }, { code: '3017620422003', name: '<b>Nutella</b>' }, { code: '12345678', name: '' }],
    }));
    expect(b.suggestions[0].unitPrice).toBeUndefined();
    expect(b.suggestions[1]).toMatchObject({ unitPrice: 1.1, priceUnit: undefined });
    expect(b.trips).toEqual([{ id: 'T', listId: '', listTitle: 'Liste', startedAt: 5, endedAt: 5, taken: 0, forgotten: ['ok'], spent: undefined }]);
    expect(b.products.map((p) => p.code)).toEqual(['3017620422003']);
  });
});
