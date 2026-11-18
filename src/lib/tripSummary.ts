import { computeBudget } from './budget';
import { sortItems } from './sort';
import type { ShoppingItem, ShoppingList, Trip } from '../types';

// Le bilan affiché en quittant le mode Magasin.

export interface TripSummary extends Omit<Trip, 'id'> {
  /** Au moins un article a été coché pendant ces courses (sinon : pas de bilan, rien d'enregistré). */
  happened: boolean;
}

export function summarizeTrip(list: Pick<ShoppingList, 'id' | 'title'>, items: ShoppingItem[], startedAt: number, endedAt: number): TripSummary {
  const alive = items.filter((i) => !i.deletedAt);
  const { pending, done } = sortItems(alive, 'category');
  const budget = computeBudget(done);
  return {
    listId: list.id,
    listTitle: list.title,
    startedAt,
    endedAt,
    taken: done.length,
    forgotten: pending.map((i) => i.name),
    spent: budget.hasPrices ? budget.spent : undefined,
    happened: done.some((i) => i.updatedAt >= startedAt),
  };
}

/** « 18 min », « 1 h 05 », « < 1 min ». */
export function formatDuration(ms: number): string {
  const min = Math.round(ms / 60000);
  if (min < 1) return '< 1 min';
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, '0')}`;
}

/** Total dépensé sur le mois en cours (courses avec des prix seulement). */
export function spentThisMonth(trips: Pick<Trip, 'endedAt' | 'spent'>[], today = new Date()): number | undefined {
  const start = new Date(today.getFullYear(), today.getMonth(), 1).getTime();
  const priced = trips.filter((t) => t.endedAt >= start && t.spent !== undefined);
  if (!priced.length) return undefined;
  return Math.round(priced.reduce((s, t) => s + (t.spent ?? 0), 0) * 100) / 100;
}
