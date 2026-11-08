import { describe, it, expect } from 'vitest';
import { guessCategoryFromName } from '../src/lib/categories';
import { sortItems, groupByCategory } from '../src/lib/sort';
import { computeBudget } from '../src/lib/budget';
import { formatQuantity, parsePrice } from '../src/lib/format';
import type { ShoppingItem } from '../src/types';

const item = (p: Partial<ShoppingItem>): ShoppingItem => ({
  id: p.name!, listId: 'l', name: 'x', category: 'other', quantity: 1, isCompleted: false,
  createdAt: 0, updatedAt: 0, order: 0, ...p,
});

describe('Rayons devinés', () => {
  it.each([
    ['Pommes de terre', 'produce'], ['Baguette', 'bakery'], ['Œufs', 'dairy'], ['Steaks hachés', 'meat'],
    ['Thé vert', 'grocery'], ['Thon en boîte', 'meat'], ['Papier toilette', 'hygiene'], ['Lessive', 'household'],
    ['Eau gazeuse', 'drinks'], ['Truc inconnu', 'other'],
  ])('%s → %s', (name, cat) => expect(guessCategoryFromName(name)).toBe(cat));
});

describe('Tri', () => {
  const items = [
    item({ name: 'Lait', category: 'dairy', order: 2 }),
    item({ name: 'Banane', category: 'produce', order: 1 }),
    item({ name: 'Abricot', category: 'produce', order: 0, isCompleted: true }),
    item({ name: 'Pain', category: 'bakery', order: 3 }),
  ];
  it('par rayon, pris à part', () => {
    const { pending, done } = sortItems(items, 'category');
    expect(pending.map((i) => i.name)).toEqual(['Banane', 'Pain', 'Lait']);
    expect(done.map((i) => i.name)).toEqual(['Abricot']);
    expect(groupByCategory(pending).map((g) => g.category)).toEqual(['produce', 'bakery', 'dairy']);
  });
  it('alphabétique', () => expect(sortItems(items, 'alpha').pending.map((i) => i.name)).toEqual(['Banane', 'Lait', 'Pain']));
  it('ordre personnel', () => expect(sortItems(items, 'custom').pending.map((i) => i.name)).toEqual(['Banane', 'Lait', 'Pain']));
});

describe('Budget', () => {
  it('additionne au centime près', () => {
    const b = computeBudget([
      item({ name: 'a', estimatedPrice: 0.1, isCompleted: true }),
      item({ name: 'b', estimatedPrice: 0.2, isCompleted: true }),
      item({ name: 'c', estimatedPrice: 5 }),
      item({ name: 'd' }),
    ]);
    expect(b).toEqual({ spent: 0.3, estimated: 5.3, checked: 2, total: 4, hasPrices: true });
  });
});

describe('Formats', () => {
  it('quantités', () => {
    expect(formatQuantity(1)).toBe('');
    expect(formatQuantity(3, 'unité')).toBe('×3');
    expect(formatQuantity(1.5, 'kg')).toBe('1,5 kg');
  });
  it('prix', () => {
    expect(parsePrice('2,49')).toBe(2.49);
    expect(parsePrice(' 3 € ')).toBe(3);
    expect(parsePrice('')).toBeUndefined();
    expect(parsePrice('abc')).toBeUndefined();
  });
});
