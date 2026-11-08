import type { ShoppingItem } from '../types';

export interface Budget {
  spent: number;     // total des articles cochés qui ont un prix
  estimated: number; // total de tous les articles qui ont un prix
  checked: number;
  total: number;
  hasPrices: boolean;
}

export function computeBudget(items: ShoppingItem[]): Budget {
  let spent = 0, estimated = 0, checked = 0, hasPrices = false;
  for (const i of items) {
    if (i.isCompleted) checked++;
    if (typeof i.estimatedPrice === 'number' && i.estimatedPrice >= 0) {
      hasPrices = true;
      estimated += i.estimatedPrice;
      if (i.isCompleted) spent += i.estimatedPrice;
    }
  }
  // arrondi au centime pour éviter 0.30000000000000004
  const round = (n: number) => Math.round(n * 100) / 100;
  return { spent: round(spent), estimated: round(estimated), checked, total: items.length, hasPrices };
}
