import { db } from './db';
import { now } from './queue';
import { addItem, type AddedItem } from './items';
import type { KnownProduct } from '../types';

// Les produits déjà scannés : code-barres → nom choisi.
// Un produit scanné une fois est reconnu ensuite tout de suite, même sans internet.

export function getKnownProduct(code: string): Promise<KnownProduct | undefined> {
  return db.products.get(code);
}

/** Ajoute le produit scanné à la liste ET retient son nom pour ce code-barres (tout ou rien). */
export async function addScannedProduct(listId: string, code: string, name: string): Promise<AddedItem | undefined> {
  return db.transaction('rw', [db.items, db.suggestions, db.syncQueue, db.products], async () => {
    const item = await addItem(listId, { name });
    if (item) await db.products.put({ code, name: item.name, category: item.category, updatedAt: now() });
    return item;
  });
}
