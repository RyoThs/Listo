import { useCallback } from 'react';
import { deleteList, restoreList } from '../../db/actions';
import { ERROR_MESSAGE, reportError } from '../../lib/errors';
import { useUI } from '../../stores/ui';

/** Supprime une liste puis propose « Annuler » (liste + articles remis). Renvoie false si ça a raté (message affiché). */
export function useDeleteList() {
  const offerUndo = useUI((s) => s.offerUndo);
  const showToast = useUI((s) => s.showToast);
  return useCallback(async (listId: string, title: string) => {
    try {
      await deleteList(listId);
      offerUndo(`Liste « ${title} » supprimée`, () => restoreList(listId));
      return true;
    } catch (e) {
      reportError(e, 'Supprimer la liste');
      showToast(ERROR_MESSAGE);
      return false;
    }
  }, [offerUndo, showToast]);
}
