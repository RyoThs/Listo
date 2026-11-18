import { formatQuantity } from './format';
import type { AddedItem } from '../db/items';

/** Le petit message après un ajout : « Lait ajouté » ou « Lait était déjà dans la liste → ×2 ». */
export function addedMessage(item: AddedItem): string {
  if (!item.merged) return `${item.name} ajouté`;
  const qty = formatQuantity(item.quantity, item.unit);
  return `${item.name} était déjà dans la liste${qty ? ` → ${qty}` : ''}`;
}
