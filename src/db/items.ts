import { db } from './db';
import { enqueue, markDeleted, now, restore } from './queue';
import { guessCategory, learnCorrection, remember } from './suggestions';
import { newId } from '../lib/id';
import { normalize, capitalize } from '../lib/text';
import type { ShoppingItem, Unit } from '../types';

// Les articles d'une liste.

export async function getActiveItems(listId: string) {
  const items = await db.items.where('listId').equals(listId).toArray();
  return items.filter((i) => !i.deletedAt);
}

export interface ItemDraft {
  name: string;
  quantity?: number;
  unit?: Unit;
  category?: string;
}

/**
 * Ajoute un article. Si le même article est déjà dans la liste (pas encore pris),
 * on augmente sa quantité au lieu de créer un doublon.
 */
export async function addItem(listId: string, draft: ItemDraft): Promise<ShoppingItem | undefined> {
  const name = capitalize(draft.name.replace(/\s+/g, ' '));
  if (!name) return undefined;
  const category = draft.category ?? (await guessCategory(name));

  return db.transaction('rw', db.items, db.suggestions, db.syncQueue, async () => {
    const items = await getActiveItems(listId);
    const key = normalize(name);
    const unitOf = (u?: Unit) => u ?? 'unité';
    const same = items.find((i) => !i.isCompleted && normalize(i.name) === key && unitOf(i.unit) === unitOf(draft.unit ?? i.unit));
    const t = now();

    if (same) {
      const quantity = same.quantity + (draft.quantity ?? 1);
      await db.items.update(same.id, { quantity, updatedAt: t });
      await enqueue('items', same.id, 'put');
      await remember(name, same.category, same.unit);
      return { ...same, quantity, updatedAt: t };
    }

    const item: ShoppingItem = {
      id: newId(), listId, name, category,
      quantity: draft.quantity ?? 1, unit: draft.unit,
      isCompleted: false, createdAt: t, updatedAt: t,
      order: items.reduce((m, i) => Math.max(m, i.order), -1) + 1,
    };
    await db.items.add(item);
    await enqueue('items', item.id, 'put');
    await remember(name, category, draft.unit);
    return item;
  });
}

export async function updateItem(id: string, changes: Partial<Omit<ShoppingItem, 'id' | 'listId' | 'createdAt'>>) {
  await db.transaction('rw', db.items, db.suggestions, db.syncQueue, async () => {
    await db.items.update(id, { ...changes, updatedAt: now() });
    await enqueue('items', id, 'put');
    if (changes.category || changes.unit) {
      const item = await db.items.get(id);
      if (item) await learnCorrection(item.name, item.category, item.unit);
    }
  });
}

export async function toggleItem(id: string) {
  const item = await db.items.get(id);
  if (item) await updateItem(id, { isCompleted: !item.isCompleted });
}

export async function deleteItem(id: string) {
  await db.transaction('rw', db.items, db.syncQueue, () => markDeleted('items', [id]));
}

export const restoreItems = (ids: string[]) => restore('items', ids);

/** Enregistre l'ordre personnel (glisser-déposer). */
export async function reorderItems(orderedIds: string[]) {
  const t = now();
  await db.transaction('rw', db.items, db.syncQueue, async () => {
    for (let i = 0; i < orderedIds.length; i++) {
      await db.items.update(orderedIds[i], { order: i, updatedAt: t });
      await enqueue('items', orderedIds[i], 'put');
    }
  });
}

/** Décoche tout, en une seule fois (tout ou rien si un souci arrive). */
export async function uncheckAll(listId: string) {
  const t = now();
  await db.transaction('rw', db.items, db.syncQueue, async () => {
    for (const i of await getActiveItems(listId)) {
      if (!i.isCompleted) continue;
      await db.items.update(i.id, { isCompleted: false, updatedAt: t });
      await enqueue('items', i.id, 'put');
    }
  });
}

/** Retire les articles cochés, en une seule fois. Renvoie leurs identifiants (pour pouvoir annuler). */
export async function removeCompleted(listId: string): Promise<string[]> {
  return db.transaction('rw', db.items, db.syncQueue, async () => {
    const ids = (await getActiveItems(listId)).filter((i) => i.isCompleted).map((i) => i.id);
    await markDeleted('items', ids);
    return ids;
  });
}
