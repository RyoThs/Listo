import { db } from './db';
import { enqueue, markDeleted, now, restore } from './queue';
import { newId } from '../lib/id';
import type { ShoppingList, SortMode } from '../types';

// Les listes de courses.

export async function getActiveLists() {
  const lists = await db.lists.orderBy('createdAt').toArray();
  return lists.filter((l) => !l.deletedAt);
}

export async function createList(input: { title: string; color: string; icon?: string }) {
  const t = now();
  const list: ShoppingList = {
    id: newId(), title: input.title.trim() || 'Nouvelle liste', color: input.color, icon: input.icon,
    createdAt: t, updatedAt: t, sortMode: 'category',
  };
  await db.transaction('rw', db.lists, db.syncQueue, async () => {
    await db.lists.add(list);
    await enqueue('lists', list.id, 'put');
  });
  return list;
}

export async function updateList(id: string, changes: Partial<Pick<ShoppingList, 'title' | 'color' | 'icon' | 'sortMode'>>) {
  await db.transaction('rw', db.lists, db.syncQueue, async () => {
    await db.lists.update(id, { ...changes, updatedAt: now() });
    await enqueue('lists', id, 'put');
  });
}

export const setSortMode = (id: string, sortMode: SortMode) => updateList(id, { sortMode });

/** Effacement doux : la liste et ses articles disparaissent de l'écran mais restent marqués « supprimés ». */
export async function deleteList(id: string) {
  const t = now();
  await db.transaction('rw', db.lists, db.items, db.syncQueue, async () => {
    await markDeleted('lists', [id], t);
    const itemIds = (await db.items.where('listId').equals(id).toArray()).filter((i) => !i.deletedAt).map((i) => i.id);
    await markDeleted('items', itemIds, t);
  });
}

/** Remet une liste ET les articles supprimés en même temps qu'elle (pas ceux retirés avant). */
export async function restoreList(id: string) {
  const list = await db.lists.get(id);
  if (!list?.deletedAt) return;
  const at = list.deletedAt;
  const itemIds = (await db.items.where('listId').equals(id).toArray()).filter((i) => i.deletedAt === at).map((i) => i.id);
  await db.transaction('rw', db.lists, db.items, db.syncQueue, async () => {
    await restore('lists', [id]);
    await restore('items', itemIds);
  });
}
