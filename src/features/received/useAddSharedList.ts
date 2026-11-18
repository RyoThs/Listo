import { useState } from 'react';
import { createListFromShared } from '../../db/actions';
import { useUI } from '../../stores/ui';
import { ERROR_MESSAGE, reportError } from '../../lib/errors';
import type { SharedList } from '../../lib/listLink';

/** Ajoute une liste reçue, puis l'ouvre. Prévient si ça rate (aucune erreur silencieuse). */
export function useAddSharedList(onDone: () => void) {
  const { openList, showToast } = useUI();
  const [busy, setBusy] = useState(false);

  const add = async (shared: SharedList) => {
    setBusy(true);
    try {
      const list = await createListFromShared(shared);
      onDone();
      openList(list.id);
      showToast(`Liste « ${list.title} » ajoutée ✓`);
    } catch (e) {
      reportError(e, 'ajout d’une liste reçue');
      showToast(ERROR_MESSAGE);
    } finally {
      setBusy(false);
    }
  };

  return { add, busy };
}
