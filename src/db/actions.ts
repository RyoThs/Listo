import { db } from './db';
import type { Favorite, FavoriteItem, ShoppingItem, ShoppingList, SortMode, SyncOp, Unit } from '../types';
import { newId } from '../lib/id';
import { guessCategoryFromName } from '../lib/categories';
import { normalize, capitalize } from '../lib/text';

// Toutes les modifications passent par ici : on écrit dans le téléphone tout de suite,
// et on note le changement dans la file d'attente (pour le futur partage en famille).

const now = () => Date.now();

async function enqueue(table: SyncOp['table'], recordId: string, action: 'put' | 'delete') {
  // Un seul changement en attente par fiche : le plus récent remplace l'ancien.
  await db.syncQueue.where('recordId').equals(recordId).delete();
  await db.syncQueue.add({ table, recordId, action, at: now() });
}

// ---------- Listes ----------

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
    await db.lists.update(id, { deletedAt: t, updatedAt: t });
    await enqueue('lists', id, 'delete');
    const items = await db.items.where('listId').equals(id).toArray();
    for (const i of items) {
      if (i.deletedAt) continue;
      await db.items.update(i.id, { deletedAt: t, updatedAt: t });
      await enqueue('items', i.id, 'delete');
    }
  });
}

export async function getActiveLists() {
  const lists = await db.lists.orderBy('createdAt').toArray();
  return lists.filter((l) => !l.deletedAt);
}

export async function getActiveItems(listId: string) {
  const items = await db.items.where('listId').equals(listId).toArray();
  return items.filter((i) => !i.deletedAt);
}

// ---------- Articles ----------

export interface ItemDraft {
  name: string;
  quantity?: number;
  unit?: Unit;
  category?: string;
}

/** Devine le rayon : d'abord ce que l'appli a appris de toi, sinon les mots-clés. */
export async function guessCategory(name: string): Promise<string> {
  const known = await db.suggestions.get(normalize(name));
  return known?.category ?? guessCategoryFromName(name);
}

async function remember(name: string, category: string, unit?: Unit) {
  const key = normalize(name);
  const existing = await db.suggestions.get(key);
  await db.suggestions.put({
    key, name, category, unit: unit ?? existing?.unit,
    count: (existing?.count ?? 0) + 1, lastUsed: now(),
  });
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
    const same = items.find((i) => !i.isCompleted && normalize(i.name) === key && (i.unit ?? 'unité') === (draft.unit ?? i.unit ?? 'unité'));
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
    // Si on corrige le rayon, l'appli s'en souvient pour la prochaine fois.
    if (changes.category || changes.unit) {
      const item = await db.items.get(id);
      if (item) {
        const key = normalize(item.name);
        const s = await db.suggestions.get(key);
        if (s) await db.suggestions.update(key, { category: item.category, unit: item.unit });
      }
    }
  });
}

export async function toggleItem(id: string) {
  const item = await db.items.get(id);
  if (item) await updateItem(id, { isCompleted: !item.isCompleted });
}

export async function deleteItem(id: string) {
  const t = now();
  await db.transaction('rw', db.items, db.syncQueue, async () => {
    await db.items.update(id, { deletedAt: t, updatedAt: t });
    await enqueue('items', id, 'delete');
  });
}

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

export async function uncheckAll(listId: string) {
  const items = await getActiveItems(listId);
  for (const i of items) if (i.isCompleted) await updateItem(i.id, { isCompleted: false });
}

/** Retire les articles cochés. Renvoie leurs identifiants (pour pouvoir annuler). */
export async function removeCompleted(listId: string): Promise<string[]> {
  const ids = (await getActiveItems(listId)).filter((i) => i.isCompleted).map((i) => i.id);
  for (const id of ids) await deleteItem(id);
  return ids;
}

// ---------- Annuler une suppression ----------
// Les suppressions sont « douces » : la fiche est seulement marquée. Annuler = enlever la marque.

async function restore(table: 'lists' | 'items' | 'favorites', ids: string[]) {
  const t = now();
  await db.transaction('rw', db.table(table), db.syncQueue, async () => {
    for (const id of ids) {
      await db.table(table).update(id, { deletedAt: undefined, updatedAt: t });
      await enqueue(table, id, 'put');
    }
  });
}

export const restoreItems = (ids: string[]) => restore('items', ids);
export const restoreFavorite = (id: string) => restore('favorites', [id]);

/** Remet une liste ET les articles supprimés en même temps qu'elle (pas ceux retirés avant). */
export async function restoreList(id: string) {
  const list = await db.lists.get(id);
  if (!list?.deletedAt) return;
  const at = list.deletedAt;
  const itemIds = (await db.items.where('listId').equals(id).toArray()).filter((i) => i.deletedAt === at).map((i) => i.id);
  await restore('lists', [id]);
  await restore('items', itemIds);
}

/** Suggestions pendant la frappe : d'abord les articles les plus utilisés. */
export async function findSuggestions(text: string, exclude: string[] = [], limit = 6) {
  const q = normalize(text);
  if (!q) return [];
  const excluded = new Set(exclude.map(normalize));
  const all = await db.suggestions.toArray();
  return all
    .filter((s) => !excluded.has(s.key) && s.key.includes(q))
    .sort((a, b) => Number(b.key.startsWith(q)) - Number(a.key.startsWith(q)) || b.count - a.count || b.lastUsed - a.lastUsed)
    .slice(0, limit);
}

// ---------- Listes favorites ----------

export async function getActiveFavorites() {
  const favs = await db.favorites.orderBy('updatedAt').reverse().toArray();
  return favs.filter((f) => !f.deletedAt);
}

export async function getFavoriteForList(listId: string) {
  const favs = await db.favorites.where('sourceListId').equals(listId).toArray();
  return favs.find((f) => !f.deletedAt);
}

/**
 * Enregistre les articles d'une liste comme favori (cochés ou non).
 * Si cette liste a déjà un favori, on le met à jour au lieu d'en créer un deuxième.
 */
export async function saveListAsFavorite(listId: string): Promise<{ favorite: Favorite; updated: boolean } | undefined> {
  const list = await db.lists.get(listId);
  if (!list) return undefined;
  const items = (await getActiveItems(listId)).sort((a, b) => a.order - b.order);
  const favItems: FavoriteItem[] = items.map(({ name, category, quantity, unit, estimatedPrice }) => ({ name, category, quantity, unit, estimatedPrice }));
  const existing = await getFavoriteForList(listId);
  const t = now();
  const favorite: Favorite = existing
    ? { ...existing, title: list.title, color: list.color, icon: list.icon, items: favItems, updatedAt: t }
    : { id: newId(), title: list.title, color: list.color, icon: list.icon, items: favItems, sourceListId: listId, createdAt: t, updatedAt: t };
  await db.transaction('rw', db.favorites, db.syncQueue, async () => {
    await db.favorites.put(favorite);
    await enqueue('favorites', favorite.id, 'put');
  });
  return { favorite, updated: !!existing };
}

/** Verse les articles d'un favori dans une liste (les doublons augmentent la quantité). Renvoie le nombre d'articles. */
export async function addFavoriteToList(favoriteId: string, listId: string): Promise<number> {
  const fav = await db.favorites.get(favoriteId);
  if (!fav || fav.deletedAt) return 0;
  let count = 0;
  for (const fi of fav.items) {
    const item = await addItem(listId, { name: fi.name, category: fi.category, quantity: fi.quantity, unit: fi.unit });
    if (item) {
      count++;
      // on reprend le prix mémorisé seulement si l'article n'en a pas déjà un
      if (fi.estimatedPrice !== undefined && item.estimatedPrice === undefined) {
        await updateItem(item.id, { estimatedPrice: fi.estimatedPrice });
      }
    }
  }
  return count;
}

/** Crée une nouvelle liste toute prête à partir d'un favori. */
export async function createListFromFavorite(favoriteId: string): Promise<ShoppingList | undefined> {
  const fav = await db.favorites.get(favoriteId);
  if (!fav || fav.deletedAt) return undefined;
  const list = await createList({ title: fav.title, color: fav.color, icon: fav.icon });
  await addFavoriteToList(favoriteId, list.id);
  return list;
}

export async function deleteFavorite(id: string) {
  const t = now();
  await db.transaction('rw', db.favorites, db.syncQueue, async () => {
    await db.favorites.update(id, { deletedAt: t, updatedAt: t });
    await enqueue('favorites', id, 'delete');
  });
}
