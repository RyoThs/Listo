import { db } from './db';
import { now } from './queue';
import { normalize } from '../lib/text';
import type { Unit } from '../types';

// La mémoire des prix : LISTO retient le dernier prix payé pour chaque article,
// pour pré-remplir le prix la fois suivante et estimer le total avant de partir.
// Le prix d'un article dans une liste est le prix de la LIGNE (quantité comprise).

const unitOf = (u?: Unit): Unit => u ?? 'unité';
export const roundCents = (n: number) => Math.round(n * 100) / 100;

/** Prix de la ligne quand la quantité change (2 € pour 1 → 4 € pour 2). */
export function scalePrice(price: number, oldQuantity: number, newQuantity: number): number {
  if (!(oldQuantity > 0)) return price;
  return roundCents((price / oldQuantity) * newQuantity);
}

/** Retient le prix payé (à appeler dans une transaction qui inclut suggestions). */
export async function rememberPrice(name: string, linePrice: number, quantity: number, unit?: Unit) {
  if (!(quantity > 0) || !(linePrice >= 0)) return;
  const key = normalize(name);
  const unitPrice = roundCents(linePrice / quantity);
  const existing = await db.suggestions.get(key);
  if (existing) await db.suggestions.update(key, { unitPrice, priceUnit: unitOf(unit) });
  else await db.suggestions.put({ key, name, category: 'other', unit, count: 1, lastUsed: now(), unitPrice, priceUnit: unitOf(unit) });
}

/** Le prix connu pour cette quantité, ou undefined si LISTO ne le connaît pas (ou pas dans cette unité). */
export async function knownPrice(name: string, quantity: number, unit?: Unit): Promise<number | undefined> {
  const s = await db.suggestions.get(normalize(name));
  if (s?.unitPrice === undefined || unitOf(s.priceUnit) !== unitOf(unit)) return undefined;
  return roundCents(s.unitPrice * quantity);
}
