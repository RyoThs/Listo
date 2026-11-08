import { ShoppingBasket, Pill, Hammer, Gift, Baby, PawPrint, House, Wine, type LucideIcon } from 'lucide-react';

export const LIST_ICONS: Record<string, LucideIcon> = {
  basket: ShoppingBasket, pharmacy: Pill, tools: Hammer, gift: Gift,
  baby: Baby, pet: PawPrint, home: House, party: Wine,
};
export const LIST_COLORS = ['#4E7F60', '#C27C4E', '#5B7FB0', '#A0617E', '#8A7A3E', '#5E8F8F', '#7A6BAE', '#6B716D'];
export const getListIcon = (id?: string) => LIST_ICONS[id ?? 'basket'] ?? ShoppingBasket;
