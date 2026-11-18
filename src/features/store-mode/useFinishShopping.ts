import { useState } from 'react';
import { saveTrip } from '../../db/actions';
import { reportError } from '../../lib/errors';
import { summarizeTrip, type TripSummary } from '../../lib/tripSummary';
import { useUI } from '../../stores/ui';
import type { ShoppingItem, ShoppingList } from '../../types';

/**
 * Quitter le mode Magasin : on calcule le bilan, on l'affiche et on l'enregistre dans l'historique.
 * Pas de bilan si rien n'a été coché pendant ces courses (simple aller-retour dans le mode).
 */
export function useFinishShopping(list: ShoppingList | null | undefined, items: ShoppingItem[]) {
  const [summary, setSummary] = useState<TripSummary | null>(null);

  const finish = () => {
    const { storeStartedAt, setStoreMode, showToast } = useUI.getState();
    setStoreMode(false);
    if (!list) return;
    const endedAt = Date.now();
    let s: TripSummary;
    try {
      s = summarizeTrip(list, items, storeStartedAt ?? endedAt, endedAt);
    } catch (e) {
      reportError(e, 'Bilan des courses');
      return; // le mode Magasin est quitté quand même
    }
    if (!s.happened) return;
    setSummary(s);
    const { happened: _, ...trip } = s;
    saveTrip(trip).catch((e) => {
      reportError(e, 'Historique des courses');
      showToast("Le bilan n'a pas pu être gardé dans l'historique");
    });
  };

  return { summary, finish, close: () => setSummary(null) };
}
