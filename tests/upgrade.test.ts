import { describe, it, expect } from 'vitest';
import Dexie from 'dexie';
import { ListoDB } from '../src/db/db';

describe('Mise à jour de la base (version 1 → 2)', () => {
  it('garde les listes et articles existants et ajoute les favoris', async () => {
    const name = 'listo-upgrade-test';
    // 1) Base telle qu'elle est aujourd'hui sur les téléphones (version 1)
    const old = new Dexie(name);
    old.version(1).stores({ lists: 'id, createdAt, updatedAt', items: 'id, listId, updatedAt', suggestions: 'key, count, lastUsed', syncQueue: '++id, recordId, at' });
    await old.table('lists').add({ id: 'L1', title: 'Ma liste', color: '#000', createdAt: 1, updatedAt: 1, sortMode: 'category' });
    await old.table('items').add({ id: 'I1', listId: 'L1', name: 'Lait', category: 'dairy', quantity: 1, isCompleted: false, createdAt: 1, updatedAt: 1, order: 0 });
    old.close();

    // 2) La nouvelle version de l'appli ouvre la même base
    const db = new ListoDB(name);
    await db.open();
    expect(db.verno).toBe(2);
    expect((await db.lists.toArray()).map((l) => l.title)).toEqual(['Ma liste']); // pas de liste « Courses de la semaine » en plus
    expect((await db.items.get('I1'))!.name).toBe('Lait');
    expect(await db.favorites.count()).toBe(0);
    db.close();
    await Dexie.delete(name);
  });
});
