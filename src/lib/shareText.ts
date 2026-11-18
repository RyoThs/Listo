import type { ShoppingItem } from '../types';
import { sortItems, groupByCategory } from './sort';
import { getCategory } from './categories';
import { formatQuantity } from './format';

/**
 * Transforme la liste en un texte simple, prêt à coller dans un SMS, WhatsApp ou un e-mail.
 * Seuls les articles encore « à prendre » sont envoyés, rangés par rayon (ordre du magasin).
 *
 *   🛒 Courses de la semaine
 *
 *   Fruits et légumes
 *   • Pommes (2 kg)
 *   • Bananes (×3)
 */
export function buildListText(title: string, items: ShoppingItem[]): string {
  const { pending } = sortItems(items, 'category');
  const lines = [`🛒 ${title}`];
  for (const group of groupByCategory(pending)) {
    lines.push('', getCategory(group.category).label);
    for (const item of group.items) {
      const qty = formatQuantity(item.quantity, item.unit);
      lines.push(`• ${item.name}${qty ? ` (${qty})` : ''}`);
    }
  }
  return lines.join('\n');
}

export type ShareResult = 'shared' | 'copied' | 'cancelled' | 'failed';

/**
 * Ouvre le menu « Partager » du téléphone (Messages, WhatsApp, Mail…).
 * Si le téléphone ne l'a pas, on copie le texte : il suffit de le coller.
 */
export async function shareText(title: string, text: string): Promise<ShareResult> {
  if (navigator.share) {
    try {
      await navigator.share({ title, text });
      return 'shared';
    } catch (e) {
      // L'utilisateur a fermé le menu : ce n'est pas une erreur.
      if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled';
      // Autre souci : on tente la copie juste en dessous.
    }
  }
  try {
    await navigator.clipboard.writeText(text);
    return 'copied';
  } catch {
    return 'failed';
  }
}
