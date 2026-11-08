import Dexie, { type EntityTable } from 'dexie';
import type { ShoppingItem, ShoppingList, Suggestion, SyncOp } from '../types';
import { newId } from '../lib/id';

// La base de données qui vit DANS le téléphone (IndexedDB). Elle marche sans internet.
export class ListoDB extends Dexie {
  lists!: EntityTable<ShoppingList, 'id'>;
  items!: EntityTable<ShoppingItem, 'id'>;
  suggestions!: EntityTable<Suggestion, 'key'>;
  syncQueue!: EntityTable<SyncOp, 'id'>;

  constructor(name = 'listo') {
    super(name);
    // Version 1 du « plan » de la base. Pour la changer plus tard : ajouter this.version(2)…
    this.version(1).stores({
      lists: 'id, createdAt, updatedAt',
      items: 'id, listId, updatedAt',
      suggestions: 'key, count, lastUsed',
      syncQueue: '++id, recordId, at',
    });

    // Au tout premier lancement : une liste prête à l'emploi.
    this.on('populate', (tx) => {
      const now = Date.now();
      tx.table('lists').add({
        id: newId(), title: 'Courses de la semaine', color: '#5B8C6E', icon: 'basket',
        createdAt: now, updatedAt: now, sortMode: 'category',
      } satisfies ShoppingList);
    });
  }
}

export const db = new ListoDB();
