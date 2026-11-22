import { db } from './db';
import { enqueue, markDeleted, now, restore } from './queue';
import { createList } from './lists';
import { addItem, getActiveItems, updateItem } from './items';
import { newId } from '../lib/id';
import type { Favorite, FavoriteItem, ShoppingList } from '../types';

// Les listes favorites (modèles de listes qu'on relance en un toucher).

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
  const favItems: FavoriteItem[] = items.map(({ name, category, quantity, unit, estimatedPrice, note }) => ({ name, category, quantity, unit, estimatedPrice, note }));
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
    const item = await addItem(listId, { name: fi.name, category: fi.category, quantity: fi.quantity, unit: fi.unit, note: fi.note });
    if (!item) continue;
    count++;
    // on reprend le prix mémorisé seulement si l'article n'en a pas déjà un
    if (fi.estimatedPrice !== undefined && item.estimatedPrice === undefined) {
      await updateItem(item.id, { estimatedPrice: fi.estimatedPrice });
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
  await db.transaction('rw', db.favorites, db.syncQueue, () => markDeleted('favorites', [id]));
}

export const restoreFavorite = (id: string) => restore('favorites', [id]);
