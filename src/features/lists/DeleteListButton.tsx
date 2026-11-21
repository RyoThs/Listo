import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { useDeleteList } from './useDeleteList';

/**
 * « Supprimer la liste » : 1er toucher = confirmation, 2e toucher = suppression.
 * Un bandeau « Annuler » permet ensuite de tout remettre (liste + articles).
 */
export function DeleteListButton({ listId, title, onDeleted }: { listId: string; title: string; onDeleted: () => void }) {
  const [confirm, setConfirm] = useState(false);
  const remove = useDeleteList();

  const run = () => {
    if (!confirm) return setConfirm(true);
    onDeleted(); // on ferme la fenêtre d'abord, puis on supprime
    void remove(listId, title);
  };

  return (
    <Button type="button" variant={confirm ? 'danger' : 'danger-ghost'} className="w-full" onClick={run}>
      <Trash2 size={18} /> {confirm ? 'Toucher encore pour supprimer' : 'Supprimer la liste'}
    </Button>
  );
}
