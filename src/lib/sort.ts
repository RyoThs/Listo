import type { ShoppingItem, SortMode } from '../types';
import { categoryRank } from './categories';

const byName = (a: ShoppingItem, b: ShoppingItem) =>
  a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' });

/** Trie les articles et sépare « à prendre » et « dans le panier ». */
export function sortItems(items: ShoppingItem[], mode: SortMode) {
  const compare =
    mode === 'alpha'
      ? byName
      : mode === 'custom'
        ? (a: ShoppingItem, b: ShoppingItem) => a.order - b.order
        : (a: ShoppingItem, b: ShoppingItem) =>
            categoryRank(a.category) - categoryRank(b.category) || byName(a, b);

  const sorted = [...items].sort(compare);
  return {
    pending: sorted.filter((i) => !i.isCompleted),
    done: sorted.filter((i) => i.isCompleted),
  };
}

/** Regroupe des articles (déjà triés) par rayon, en gardant l'ordre. */
export function groupByCategory(items: ShoppingItem[]) {
  const groups: { category: string; items: ShoppingItem[] }[] = [];
  for (const item of items) {
    const last = groups[groups.length - 1];
    if (last && last.category === item.category) last.items.push(item);
    else groups.push({ category: item.category, items: [item] });
  }
  return groups;
}
