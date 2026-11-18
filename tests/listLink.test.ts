import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../src/db/db';
import * as A from '../src/db/actions';
import { buildListLink, readListLink, ListLinkError, MAX_SHARED_ITEMS } from '../src/lib/listLink';
import { buildListText } from '../src/lib/shareText';
import type { ShoppingItem } from '../src/types';

const APP = 'https://ryoths.github.io/Listo/';
const item = (p: Partial<ShoppingItem>): ShoppingItem => ({
  id: p.name!, listId: 'l', name: 'x', category: 'other', quantity: 1, isCompleted: false,
  createdAt: 0, order: 0, updatedAt: 0, ...p,
});
const list = { title: 'Courses 🍝 été', color: '#C27C4E', icon: 'party' };
/** Fabrique un lien à la main, comme pourrait le faire quelqu'un de malveillant. */
const forge = (payload: unknown) => {
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  return `${APP}#liste=${btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')}`;
};

describe('Lien « Ouvrir dans LISTO »', () => {
  const items = [
    item({ name: 'Pâtes', category: 'grocery', quantity: 2 }),
    item({ name: 'Pommes', category: 'produce', quantity: 1.5, unit: 'kg' }),
    item({ name: 'Croquettes', category: 'pets' }),
    item({ name: 'Pain', category: 'bakery', isCompleted: true }),
  ];

  it('fait l’aller-retour (accents, emoji, quantités, rayons) dans l’ordre du magasin, sans les articles pris', () => {
    const link = buildListLink(list, items, APP);
    expect(link.startsWith(`${APP}#liste=`)).toBe(true);
    expect(link).toMatch(/^[\w:/.#=-]+$/); // que des caractères sûrs dans un SMS
    expect(readListLink(link)).toEqual({
      title: 'Courses 🍝 été', color: '#C27C4E', icon: 'party',
      items: [
        { name: 'Pommes', quantity: 1.5, unit: 'kg', category: 'produce' },
        { name: 'Pâtes', quantity: 2, unit: undefined, category: 'grocery' },
        { name: 'Croquettes', quantity: 1, unit: undefined, category: 'pets' },
      ],
    });
  });

  it('retrouve le lien au milieu du message collé en entier', () => {
    const link = buildListLink(list, items, APP);
    const message = buildListText(list.title, items, link);
    expect(message.endsWith(`\n\n📲 Ouvrir dans LISTO :\n${link}`)).toBe(true);
    expect(readListLink(`Salut ! Tu peux passer ?\n\n${message}\nMerci`)?.items).toHaveLength(3);
  });

  it('sans lien → rien ; lien abîmé ou coupé → message clair', () => {
    expect(readListLink('🛒 Courses\n• Lait')).toBeNull();
    const link = buildListLink(list, items, APP);
    expect(() => readListLink(link.slice(0, -7))).toThrow(ListLinkError);
    expect(() => readListLink(`${APP}#liste=abc`)).toThrow(ListLinkError);
    expect(() => readListLink(forge({ v: 1, t: 'Vide', a: [] }))).toThrow(/aucun article/);
    expect(() => readListLink(forge({ v: 9, a: [['Lait']] }))).toThrow(/plus récente/);
  });

  it('ne fait pas confiance au contenu du lien', () => {
    const shared = readListLink(forge({
      v: 1, t: 'x'.repeat(500), c: 'red;background:url(evil)', i: 'inconnu',
      a: [['  Lait   demi  écrémé ', -3, 'tonnes', 'rayon-pirate'], [42], 'pas un tableau', ['N'.repeat(900), 1e9], ['   ']],
    }))!;
    expect(shared.title).toHaveLength(40);
    expect(shared.color).toBe('#4E7F60');
    expect(shared.icon).toBe('basket');
    expect(shared.items).toEqual([
      { name: 'Lait demi écrémé', quantity: 1, unit: undefined, category: undefined },
      { name: 'N'.repeat(120), quantity: 9999, unit: undefined, category: undefined },
    ]);
    const many = readListLink(forge({ v: 1, a: Array.from({ length: 1000 }, (_, i) => [`Article ${i}`]) }))!;
    expect(many.items).toHaveLength(MAX_SHARED_ITEMS);
    expect(many.title).toBe('Liste reçue');
  });

  it('reste raisonnable pour une liste de 40 articles', () => {
    const big = Array.from({ length: 40 }, (_, i) => item({ name: `Article numéro ${i}`, category: 'grocery', quantity: 2 }));
    expect(buildListLink(list, big, APP).length).toBeLessThan(2500);
  });
});

describe('Ajouter une liste reçue', () => {
  beforeEach(async () => { await db.delete(); await db.open(); });

  it('crée la liste avec ses articles, rangés dans leurs rayons', async () => {
    const shared = readListLink(forge({ v: 1, t: 'Chez Mamie', c: '#5B7FB0', i: 'home', a: [['Lait', 2], ['Pommes', 1.5, 'kg', 'produce'], ['Pâtée pour chat'], ['Truc', 1, '', 'grocery']] }))!;
    const created = await A.createListFromShared(shared);
    expect(created).toMatchObject({ title: 'Chez Mamie', color: '#5B7FB0', icon: 'home' });
    const got = (await A.getActiveItems(created.id)).sort((a, b) => a.order - b.order);
    expect(got.map((i) => [i.name, i.quantity, i.unit, i.category])).toEqual([
      ['Lait', 2, undefined, 'dairy'],      // rayon absent → deviné
      ['Pommes', 1.5, 'kg', 'produce'],
      ['Pâtée pour chat', 1, undefined, 'pets'],
      ['Truc', 1, undefined, 'grocery'],    // rayon du lien gardé
    ]);
    expect(got.every((i) => !i.isCompleted)).toBe(true);
  });

  // « Tout ou rien » (un article qui rate = aucune liste créée) : vérifié dans un vrai navigateur (Playwright),
  // car la fausse base des tests (fake-indexeddb) n'annule pas les transactions comme un téléphone.
});
