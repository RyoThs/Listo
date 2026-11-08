import {
  Apple, Croissant, Milk, Beef, Snowflake, Package, CupSoda, Bath, SprayCan, ShoppingBag,
  type LucideIcon,
} from 'lucide-react';
import { normalize } from './text';

export interface Category {
  id: string;
  label: string;
  icon: LucideIcon;
  color: string; // pastille douce
  keywords: string[];
}

// L'ordre de ce tableau = l'ordre des rayons dans un magasin classique (entrée → caisses).
export const CATEGORIES: Category[] = [
  { id: 'produce', label: 'Fruits et légumes', icon: Apple, color: '#7FB77E', keywords: ['pomme de terre', 'patate', 'pomme', 'banane', 'poire', 'orange', 'citron', 'tomate', 'salade', 'carotte', 'oignon', 'ail', 'echalote', 'courgette', 'aubergine', 'poireau', 'fraise', 'framboise', 'raisin', 'avocat', 'concombre', 'poivron', 'champignon', 'legume', 'fruit', 'kiwi', 'melon', 'pasteque', 'persil', 'basilic', 'coriandre', 'epinard', 'brocoli', 'chou', 'haricot vert', 'clementine', 'mandarine', 'peche', 'abricot', 'mangue', 'ananas', 'radis', 'betterave', 'courge', 'potiron'] },
  { id: 'bakery', label: 'Boulangerie', icon: Croissant, color: '#D9A55B', keywords: ['pain de mie', 'pain', 'baguette', 'croissant', 'brioche', 'biscotte', 'chocolatine', 'pain au chocolat', 'viennoiserie', 'tortilla', 'galette'] },
  { id: 'dairy', label: 'Crèmerie', icon: Milk, color: '#8FB3D9', keywords: ['lait', 'yaourt', 'yogourt', 'fromage', 'beurre', 'creme', 'oeuf', 'emmental', 'mozzarella', 'comte', 'camembert', 'parmesan', 'gruyere', 'feta', 'skyr', 'fromage blanc', 'kefir', 'chevre'] },
  { id: 'meat', label: 'Viande et poisson', icon: Beef, color: '#D98282', keywords: ['poulet', 'boeuf', 'steak', 'jambon', 'porc', 'saucisse', 'viande', 'dinde', 'lardon', 'poisson', 'saumon', 'thon', 'crevette', 'cabillaud', 'bacon', 'merguez', 'escalope', 'cote', 'filet', 'hache', 'chorizo', 'saucisson'] },
  { id: 'frozen', label: 'Surgelés', icon: Snowflake, color: '#86C5C9', keywords: ['surgele', 'glace', 'frites', 'congele', 'sorbet', 'esquimau'] },
  { id: 'grocery', label: 'Épicerie', icon: Package, color: '#C9A27E', keywords: ['pates', 'pate', 'riz', 'farine', 'sucre', 'sel', 'huile', 'vinaigre', 'cafe', 'the', 'cereales', 'cereale', 'conserve', 'sauce', 'chocolat', 'biscuit', 'gateau', 'confiture', 'miel', 'moutarde', 'ketchup', 'mayonnaise', 'lentille', 'pois chiche', 'epice', 'poivre', 'chips', 'compote', 'soupe', 'semoule', 'quinoa', 'levure', 'bonbon', 'nutella', 'muesli'] },
  { id: 'drinks', label: 'Boissons', icon: CupSoda, color: '#A08FD1', keywords: ['eau', 'jus', 'soda', 'coca', 'biere', 'vin', 'sirop', 'limonade', 'champagne', 'cidre', 'ice tea'] },
  { id: 'hygiene', label: 'Hygiène', icon: Bath, color: '#E0A3C2', keywords: ['savon', 'shampoing', 'shampooing', 'dentifrice', 'gel douche', 'deodorant', 'coton', 'rasoir', 'mouchoir', 'papier toilette', 'couche', 'brosse a dents', 'serviette hygienique', 'creme solaire', 'lingette'] },
  { id: 'household', label: 'Maison', icon: SprayCan, color: '#9AA6A0', keywords: ['lessive', 'liquide vaisselle', 'pastille lave-vaisselle', 'eponge', 'sac poubelle', 'essuie-tout', 'sopalin', 'javel', 'nettoyant', 'ampoule', 'pile', 'adoucissant', 'aluminium', 'film alimentaire'] },
  { id: 'other', label: 'Autre', icon: ShoppingBag, color: '#B8B2A7', keywords: [] },
];

export const DEFAULT_CATEGORY = 'other';

const byId = new Map(CATEGORIES.map((c) => [c.id, c]));
export function getCategory(id: string): Category {
  return byId.get(id) ?? byId.get(DEFAULT_CATEGORY)!;
}
export function categoryRank(id: string): number {
  const i = CATEGORIES.findIndex((c) => c.id === id);
  return i === -1 ? CATEGORIES.length : i;
}

// Tous les mots-clés, du plus long au plus court (« pomme de terre » avant « pomme »).
const KEYWORDS = CATEGORIES.flatMap((c) => c.keywords.map((k) => ({ k, id: c.id }))).sort(
  (a, b) => b.k.length - a.k.length,
);

/** Devine le rayon d'un article à partir de son nom (« 2 steaks hachés » → Viande). */
export function guessCategoryFromName(name: string): string {
  const n = ' ' + normalize(name).replace(/[’']/g, ' ') + ' ';
  for (const { k, id } of KEYWORDS) {
    // le mot-clé doit commencer un mot ; on accepte le pluriel (s, x)
    if (new RegExp(`\\s${k}(s|x)?[\\s-]`).test(n)) return id;
  }
  return DEFAULT_CATEGORY;
}
