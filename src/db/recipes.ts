import { db } from './db';
import { enqueue, now } from './queue';
import { addItem, type ItemDraft } from './items';
import { guessCategory } from './suggestions';
import { newId } from '../lib/id';
import { parseEntry, splitEntries } from '../lib/parse';
import { LIST_COLORS } from '../lib/listIcons';
import type { Favorite, FavoriteItem } from '../types';

// Packs et recettes : un pack est un favori (modèle d'articles) qu'on verse dans une liste.

/** Ajoute des ingrédients à une liste, tout ou rien. Les doublons augmentent la quantité. Renvoie le nombre d'ingrédients ajoutés. */
export async function addIngredientsToList(listId: string, drafts: ItemDraft[]): Promise<number> {
  return db.transaction('rw', [db.items, db.suggestions, db.syncQueue], async () => {
    let n = 0;
    for (const d of drafts) if (await addItem(listId, d)) n++;
    return n;
  });
}

async function savePack(title: string, drafts: ItemDraft[]): Promise<Favorite> {
  const name = title.replace(/\s+/g, ' ').trim().slice(0, 40);
  if (!name) throw new Error('Donne un nom au pack.');
  const items: FavoriteItem[] = [];
  for (const d of drafts) {
    const itemName = d.name.replace(/\s+/g, ' ').trim();
    if (!itemName) continue;
    items.push({
      name: itemName.charAt(0).toUpperCase() + itemName.slice(1),
      category: d.category ?? (await guessCategory(itemName)),
      quantity: d.quantity && d.quantity > 0 ? d.quantity : 1,
      unit: d.unit,
    });
  }
  if (!items.length) throw new Error('Ajoute au moins un ingrédient.');
  const t = now();
  const pack: Favorite = { id: newId(), title: name, color: LIST_COLORS[0], icon: 'basket', items, createdAt: t, updatedAt: t };
  await db.transaction('rw', db.favorites, db.syncQueue, async () => {
    await db.favorites.add(pack);
    await enqueue('favorites', pack.id, 'put');
  });
  return pack;
}

/** « Nouveau pack » : un nom + les ingrédients tapés (« 500 g de viande hachée, oignons »). */
export function createPack(title: string, text: string): Promise<Favorite> {
  return savePack(title, splitEntries(text).map(parseEntry).filter((e) => e.name));
}

/** « Garder dans mes packs » depuis une recette. */
export function saveRecipeAsPack(title: string, drafts: ItemDraft[]): Promise<Favorite> {
  return savePack(title, drafts);
}
