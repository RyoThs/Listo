import { describe, it, expect } from 'vitest';
import { buildListText } from '../src/lib/shareText';
import { guessCategoryFromName } from '../src/lib/categories';
import type { ShoppingItem } from '../src/types';

const item = (p: Partial<ShoppingItem>): ShoppingItem => ({
  id: p.name!, listId: 'l', name: 'x', category: 'other', quantity: 1, isCompleted: false,
  createdAt: 0, order: 0, updatedAt: 0, ...p,
});

describe('Rayon Animalerie', () => {
  it.each([
    'Croquettes', 'Pâtée pour chat', 'Litière', 'Thon pour chat', 'Lait pour chat',
    'Os à mâcher', 'Friandises chien', 'Poisson rouge', 'Sacs à crottes',
  ])('« %s » → Animalerie', (name) => expect(guessCategoryFromName(name)).toBe('pets'));

  it('ne vole pas les autres rayons', () => {
    expect(guessCategoryFromName('Lait')).toBe('dairy');
    expect(guessCategoryFromName('Thon')).toBe('meat');
    expect(guessCategoryFromName('Poisson pané')).toBe('meat');
    expect(guessCategoryFromName('Châtaignes')).toBe('other');
  });
});

describe('Texte de la liste à envoyer', () => {
  it('range par rayon, met les quantités et oublie les articles pris', () => {
    const text = buildListText('Courses', [
      item({ name: 'Lait', category: 'dairy', quantity: 2 }),
      item({ name: 'Pommes', category: 'produce', quantity: 1.5, unit: 'kg' }),
      item({ name: 'Croquettes', category: 'pets' }),
      item({ name: 'Pain', category: 'bakery', isCompleted: true }),
    ]);
    expect(text).toBe(
      '🛒 Courses\n\nFruits et légumes\n• Pommes (1,5 kg)\n\nCrèmerie\n• Lait (×2)\n\nAnimalerie\n• Croquettes',
    );
  });
});
