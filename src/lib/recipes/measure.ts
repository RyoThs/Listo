import type { Unit } from '../../types';

// Lire les quantités de TheMealDB, écrites librement en anglais : « 500g », « 1 lb », « 2 tbsp », « pinch »…
// On ne garde que ce qui compte pour les courses (poids, volume, nombre de pièces).
// Cuillères, pincées, « au goût »… → null : on achète simplement 1 paquet.

export interface Measure { quantity: number; unit?: Unit }

const FRACTIONS: Record<string, number> = { '½': 0.5, '¼': 0.25, '¾': 0.75, '⅓': 1 / 3, '⅔': 2 / 3 };
const NUMBER = String.raw`(\d+(?:[.,]\d+)?(?:\s+\d+\/\d+)?|\d+\/\d+|[½¼¾⅓⅔])`;
const PATTERN = new RegExp(`^${NUMBER}\\s*([a-zA-Z]*)`);

function toNumber(text: string): number {
  if (FRACTIONS[text] !== undefined) return FRACTIONS[text];
  return text.split(/\s+/).reduce((sum, part) => {
    if (part.includes('/')) { const [a, b] = part.split('/').map(Number); return sum + (b ? a / b : 0); }
    return sum + Number(part.replace(',', '.'));
  }, 0);
}

const round2 = (n: number) => Math.round(n * 100) / 100;
// Mots qui veulent dire « quelques pièces » : 3 large (onions), 2 cans…
const PIECES = new Set(['', 'large', 'medium', 'small', 'whole', 'can', 'cans', 'tin', 'tins', 'x', 'pieces', 'piece', 'big', 'fillets', 'fillet', 'breasts', 'thighs', 'sliced', 'chopped', 'diced', 'beaten', 'halved']);

export function parseMeasure(text: string): Measure | null {
  const t = (text ?? '').trim().toLowerCase();
  const m = PATTERN.exec(t);
  if (!m) return null;
  const n = toNumber(m[1]);
  if (!(n > 0)) return null;
  const word = m[2];
  switch (word) {
    case 'g': case 'gr': case 'gram': case 'grams': return { quantity: Math.round(n), unit: 'g' };
    case 'kg': case 'kilo': case 'kilos': return { quantity: round2(n), unit: 'kg' };
    case 'ml': return { quantity: round2(n / 1000), unit: 'L' };
    case 'cl': return { quantity: round2(n / 100), unit: 'L' };
    case 'l': case 'litre': case 'litres': case 'liter': case 'liters': return { quantity: round2(n), unit: 'L' };
    case 'lb': case 'lbs': case 'pound': case 'pounds': return { quantity: round2(n * 0.4536), unit: 'kg' };
    case 'oz': case 'ounce': case 'ounces': return { quantity: Math.round((n * 28.35) / 10) * 10, unit: 'g' };
  }
  if (PIECES.has(word)) return { quantity: Math.max(1, Math.ceil(n - 1e-9)) };
  return null; // tbsp, tsp, cup, cloves, pinch, handful…
}
