import { db } from './db';
import { createList } from './lists';
import { addItem } from './items';
import type { SharedList } from '../lib/listLink';
import type { ShoppingList } from '../types';

// Ajoute une liste reçue par message (lien « Ouvrir dans LISTO »).

/**
 * Crée la liste et tous ses articles d'un seul coup : tout ou rien.
 * Si quelque chose rate en route, aucune liste à moitié remplie n'apparaît.
 */
export async function createListFromShared(shared: SharedList): Promise<ShoppingList> {
  return db.transaction('rw', [db.lists, db.items, db.suggestions, db.syncQueue], async () => {
    const list = await createList({ title: shared.title, color: shared.color, icon: shared.icon });
    for (const item of shared.items) {
      await addItem(list.id, { name: item.name, quantity: item.quantity, unit: item.unit, category: item.category, note: item.note });
    }
    return list;
  });
}
