import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { deleteList, restoreList } from '../../db/actions';
import { ERROR_MESSAGE, reportError } from '../../lib/errors';
import { useUI } from '../../stores/ui';

/**
 * « Supprimer la liste » : 1er toucher = confirmation, 2e toucher = suppression.
 * Un bandeau « Annuler » permet ensuite de tout remettre (liste + articles).
 */
export function DeleteListButton({ listId, title, onDeleted }: { listId: string; title: string; onDeleted: () => void }) {
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const { offerUndo, showToast } = useUI();

  const run = async () => {
    if (!confirm) return setConfirm(true);
    setBusy(true);
    try {
      onDeleted(); // on ferme la fenêtre d'abord, puis on supprime
      await deleteList(listId);
      offerUndo(`Liste « ${title} » supprimée`, () => restoreList(listId));
    } catch (e) {
      reportError(e, 'Supprimer la liste');
      showToast(ERROR_MESSAGE);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button type="button" variant={confirm ? 'danger' : 'danger-ghost'} disabled={busy}
      className="w-full" onClick={() => void run()}>
      <Trash2 size={18} /> {confirm ? 'Toucher encore pour supprimer' : 'Supprimer la liste'}
    </Button>
  );
}
