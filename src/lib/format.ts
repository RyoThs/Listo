import type { Unit } from '../types';

const euro = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });
const num = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 });

export const formatPrice = (n: number) => euro.format(n);

/** 3 unités → « ×3 », 1 unité → « » , 1.5 kg → « 1,5 kg ». */
export function formatQuantity(quantity: number, unit?: Unit): string {
  if (!unit || unit === 'unité') return quantity === 1 ? '' : `×${num.format(quantity)}`;
  return `${num.format(quantity)} ${unit}`;
}

/** Pas des boutons + / − selon l'unité. */
export function stepFor(unit?: Unit): number {
  if (unit === 'g') return 100;
  if (unit === 'kg' || unit === 'L') return 0.5;
  return 1;
}

/** « 2,50 » ou « 2.5 € » → 2.5 ; vide → undefined. */
export function parsePrice(text: string): number | undefined {
  const t = text.replace(/[€\s]/g, '').replace(',', '.');
  if (!t) return undefined;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : undefined;
}
