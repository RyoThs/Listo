import type { Recipe, RecipeIngredient, } from './types';
import type { Unit } from '../../types';

// Catalogue de plats français du quotidien, écrit pour LISTO. Quantités pour 4 personnes.
// Marche sans internet. « * » au début d'un nom = ingrédient des placards (pas coché d'office).

type Row = [name: string, quantity: number, unit?: Unit];
const r = (id: string, emoji: string, title: string, rows: Row[]): Recipe => ({
  id: `catalog-${id}`, emoji, title, servings: 4, source: 'catalog',
  ingredients: rows.map(([name, quantity, unit]): RecipeIngredient => (
    name.startsWith('*') ? { name: name.slice(1), quantity, unit, pantry: true } : { name, quantity, unit }
  )),
});

export const CATALOG: Recipe[] = [
  r('lasagnes', '🍝', 'Lasagnes à la bolognaise', [['Pâtes à lasagne', 250, 'g'], ['Viande hachée', 500, 'g'], ['Sauce tomate', 1], ['Oignons', 1], ['Ail', 1], ['Lait', 0.5, 'L'], ['Beurre', 50, 'g'], ['Fromage râpé', 150, 'g'], ['*Farine', 50, 'g'], ['*Muscade', 1]]),
  r('bolognaise', '🍝', 'Spaghettis bolognaise', [['Spaghettis', 500, 'g'], ['Viande hachée', 400, 'g'], ['Tomates concassées en conserve', 2], ['Oignons', 1], ['Carottes', 1], ['Ail', 1], ['Parmesan', 80, 'g'], ['*Huile d’olive', 1]]),
  r('carbonara', '🥓', 'Pâtes carbonara', [['Spaghettis', 400, 'g'], ['Lardons', 200, 'g'], ['Œufs', 4], ['Parmesan', 80, 'g'], ['*Poivre', 1]]),
  r('blanquette', '🍲', 'Blanquette de veau', [['Veau (épaule)', 1, 'kg'], ['Carottes', 3], ['Champignons de Paris', 250, 'g'], ['Oignons', 1], ['Crème fraîche', 0.2, 'L'], ['Bouillon de volaille', 1], ['Citrons', 1], ['Riz', 300, 'g'], ['Beurre', 40, 'g'], ['*Farine', 40, 'g']]),
  r('bourguignon', '🍷', 'Bœuf bourguignon', [['Bœuf à braiser', 1.2, 'kg'], ['Vin rouge', 0.75, 'L'], ['Lardons', 200, 'g'], ['Carottes', 3], ['Oignons', 2], ['Champignons de Paris', 250, 'g'], ['Ail', 1], ['Bouillon de bœuf', 1], ['*Farine', 30, 'g'], ['*Thym', 1], ['*Laurier', 1]]),
  r('pot-au-feu', '🥕', 'Pot-au-feu', [['Bœuf pour pot-au-feu', 1.5, 'kg'], ['Carottes', 6], ['Poireaux', 3], ['Navets', 4], ['Pommes de terre', 1, 'kg'], ['Oignons', 2], ['Céleri', 1], ['*Gros sel', 1], ['*Laurier', 1]]),
  r('poulet-roti', '🍗', 'Poulet rôti et pommes de terre', [['Poulet entier', 1], ['Pommes de terre', 1, 'kg'], ['Ail', 1], ['Beurre', 30, 'g'], ['*Huile d’olive', 1], ['*Thym', 1]]),
  r('poulet-curry', '🍛', 'Poulet au curry et lait de coco', [['Blancs de poulet', 600, 'g'], ['Lait de coco', 0.4, 'L'], ['Oignons', 1], ['Tomates', 2], ['Riz basmati', 300, 'g'], ['Coriandre', 1], ['*Curry', 1], ['*Huile', 1]]),
  r('quiche', '🥧', 'Quiche lorraine', [['Pâte brisée', 1], ['Lardons', 200, 'g'], ['Œufs', 3], ['Crème fraîche', 0.2, 'L'], ['Lait', 0.2, 'L'], ['Emmental râpé', 100, 'g'], ['*Muscade', 1]]),
  r('gratin-dauphinois', '🥔', 'Gratin dauphinois', [['Pommes de terre', 1.2, 'kg'], ['Lait', 0.5, 'L'], ['Crème fraîche', 0.25, 'L'], ['Ail', 1], ['Beurre', 20, 'g'], ['*Muscade', 1]]),
  r('hachis', '🥔', 'Hachis parmentier', [['Viande hachée', 500, 'g'], ['Pommes de terre', 1, 'kg'], ['Oignons', 1], ['Lait', 0.2, 'L'], ['Beurre', 50, 'g'], ['Fromage râpé', 80, 'g']]),
  r('tartiflette', '🧀', 'Tartiflette', [['Reblochon', 1], ['Pommes de terre', 1, 'kg'], ['Lardons', 200, 'g'], ['Oignons', 2], ['Crème fraîche', 0.2, 'L'], ['Vin blanc', 0.1, 'L']]),
  r('raclette', '🧀', 'Raclette', [['Fromage à raclette', 800, 'g'], ['Pommes de terre', 1.2, 'kg'], ['Jambon', 4], ['Saucisson', 1], ['Cornichons', 1], ['Salade', 1]]),
  r('chili', '🌶️', 'Chili con carne', [['Viande hachée', 500, 'g'], ['Haricots rouges en conserve', 2], ['Tomates concassées en conserve', 1], ['Oignons', 2], ['Poivrons rouges', 1], ['Riz', 300, 'g'], ['*Cumin', 1], ['*Piment en poudre', 1]]),
  r('ratatouille', '🍆', 'Ratatouille', [['Aubergines', 2], ['Courgettes', 2], ['Poivrons', 2], ['Tomates', 4], ['Oignons', 2], ['Ail', 1], ['*Huile d’olive', 1], ['*Herbes de Provence', 1]]),
  r('soupe-legumes', '🥣', 'Soupe de légumes', [['Poireaux', 2], ['Carottes', 4], ['Pommes de terre', 3], ['Oignons', 1], ['Bouillon de légumes', 1], ['Crème fraîche', 0.1, 'L']]),
  r('veloute-potiron', '🎃', 'Velouté de potiron', [['Potiron', 1, 'kg'], ['Pommes de terre', 2], ['Oignons', 1], ['Bouillon de légumes', 1], ['Crème fraîche', 0.1, 'L']]),
  r('crepes', '🥞', 'Crêpes', [['Farine', 250, 'g'], ['Œufs', 4], ['Lait', 0.5, 'L'], ['Beurre', 50, 'g'], ['*Sucre', 1], ['*Sel', 1]]),
  r('galettes', '🥞', 'Galettes complètes (sarrasin)', [['Farine de sarrasin', 250, 'g'], ['Œufs', 6], ['Jambon', 4], ['Emmental râpé', 150, 'g'], ['Beurre', 50, 'g'], ['*Sel', 1]]),
  r('croque', '🥪', 'Croque-monsieur', [['Pain de mie', 1], ['Jambon', 4], ['Emmental râpé', 150, 'g'], ['Beurre', 50, 'g'], ['Lait', 0.2, 'L']]),
  r('salade-nicoise', '🥗', 'Salade niçoise', [['Salade', 1], ['Tomates', 4], ['Thon en conserve', 2], ['Œufs', 4], ['Haricots verts', 300, 'g'], ['Olives noires', 1], ['Poivrons', 1], ['*Huile d’olive', 1], ['*Vinaigre', 1]]),
  r('saumon-papillote', '🐟', 'Saumon en papillote', [['Pavés de saumon', 4], ['Citrons', 2], ['Courgettes', 2], ['Riz', 300, 'g'], ['Aneth', 1], ['*Huile d’olive', 1]]),
  r('moules-frites', '🦪', 'Moules-frites', [['Moules', 2, 'kg'], ['Frites surgelées', 1, 'kg'], ['Échalotes', 2], ['Vin blanc', 0.2, 'L'], ['Persil', 1], ['Beurre', 30, 'g']]),
  r('couscous', '🥘', 'Couscous poulet merguez', [['Semoule', 500, 'g'], ['Cuisses de poulet', 4], ['Merguez', 8], ['Pois chiches en conserve', 1], ['Carottes', 3], ['Courgettes', 2], ['Navets', 2], ['Oignons', 1], ['*Ras el hanout', 1]]),
  r('tajine', '🥘', 'Tajine de poulet aux citrons', [['Cuisses de poulet', 4], ['Citrons confits', 2], ['Olives vertes', 1], ['Oignons', 2], ['Coriandre', 1], ['Semoule', 300, 'g'], ['*Gingembre en poudre', 1], ['*Curcuma', 1]]),
  r('risotto', '🍚', 'Risotto aux champignons', [['Riz à risotto', 300, 'g'], ['Champignons', 400, 'g'], ['Échalotes', 2], ['Vin blanc', 0.1, 'L'], ['Bouillon de volaille', 1], ['Parmesan', 80, 'g'], ['Beurre', 40, 'g']]),
  r('omelette', '🍳', 'Omelette aux champignons', [['Œufs', 8], ['Champignons', 250, 'g'], ['Fromage râpé', 80, 'g'], ['Beurre', 20, 'g'], ['Salade', 1]]),
  r('burgers', '🍔', 'Burgers maison', [['Pains à burger', 4], ['Steaks hachés', 4], ['Cheddar', 4], ['Tomates', 2], ['Salade', 1], ['Oignons rouges', 1], ['Frites surgelées', 1, 'kg'], ['Ketchup', 1]]),
  r('tacos', '🌮', 'Tacos / fajitas au poulet', [['Tortillas', 8], ['Blancs de poulet', 500, 'g'], ['Poivrons', 2], ['Oignons', 1], ['Avocats', 2], ['Crème fraîche', 0.2, 'L'], ['Fromage râpé', 100, 'g'], ['*Épices fajitas', 1]]),
  r('pizza', '🍕', 'Pizza maison', [['Pâte à pizza', 2], ['Sauce tomate', 1], ['Mozzarella', 2], ['Jambon', 4], ['Champignons', 200, 'g'], ['Olives noires', 1], ['*Origan', 1]]),
  r('gratin-pates', '🧀', 'Gratin de pâtes au jambon', [['Pâtes', 400, 'g'], ['Jambon', 4], ['Crème fraîche', 0.2, 'L'], ['Fromage râpé', 150, 'g']]),
  r('mousse-chocolat', '🍫', 'Mousse au chocolat', [['Chocolat noir', 200, 'g'], ['Œufs', 6], ['*Sucre', 1], ['*Sel', 1]]),
  r('tarte-pommes', '🍎', 'Tarte aux pommes', [['Pâte brisée', 1], ['Pommes', 6], ['Beurre', 30, 'g'], ['*Sucre', 1], ['*Cannelle', 1]]),
  r('gateau-yaourt', '🍰', 'Gâteau au yaourt', [['Yaourt nature', 1], ['Œufs', 3], ['Farine', 250, 'g'], ['*Sucre', 1], ['*Huile', 1], ['*Levure chimique', 1]]),
];

/** Recherche simple dans le catalogue (sans accents ni majuscules), par plat ou par ingrédient. */
export function searchCatalog(query: string): Recipe[] {
  const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const q = fold(query.trim());
  if (!q) return CATALOG;
  return CATALOG.filter((rec) => fold(rec.title).includes(q) || rec.ingredients.some((i) => fold(i.name).includes(q)));
}
