import { ListChecks, Star, CopyPlus } from 'lucide-react';
import { Sheet } from '../../components/ui/Sheet';
import { Button } from '../../components/ui/Button';
import { Segmented } from '../../components/ui/Segmented';
import { removeCompleted, restoreItems, saveListAsFavorite, setSortMode, uncheckAll } from '../../db/actions';
import { useUI } from '../../stores/ui';
import { DeleteListButton } from '../lists/DeleteListButton';
import type { SortMode } from '../../types';

const SORTS: { id: SortMode; label: string }[] = [
  { id: 'category', label: 'Par rayon' },
  { id: 'alpha', label: 'A → Z' },
  { id: 'custom', label: 'Mon ordre' },
];

const COMPLETED: { id: 'dim' | 'hide'; label: string }[] = [
  { id: 'dim', label: 'Griser' },
  { id: 'hide', label: 'Masquer' },
];

interface Props {
  open: boolean;
  onClose: () => void;
  listId: string;
  listTitle: string;
  mode: SortMode;
  itemCount: number;
  doneCount: number;
  hasFavorite: boolean;
  onPickFavorite: () => void;
}

/** Fenêtre « Options de la liste » : tri, articles pris, favori, tout décocher, retirer les pris, supprimer la liste. */
export function ListOptionsSheet({ open, onClose, listId, listTitle, mode, itemCount, doneCount, hasFavorite, onPickFavorite }: Props) {
  const { completedDisplay, setCompletedDisplay, showToast, offerUndo } = useUI();

  const saveFavorite = async () => {
    const r = await saveListAsFavorite(listId);
    if (r) showToast(r.updated ? 'Favori mis à jour ⭐' : 'Enregistrée en favori ⭐');
    onClose();
  };

  const removeDone = async () => {
    onClose();
    const ids = await removeCompleted(listId);
    offerUndo(ids.length === 1 ? '1 article retiré' : `${ids.length} articles retirés`, () => restoreItems(ids));
  };

  return (
    <Sheet open={open} onClose={onClose} title="Options de la liste">
      <div className="space-y-5 pb-2">
        <div>
          <span className="mb-2 block text-sm font-medium text-muted">Trier</span>
          <Segmented options={SORTS} value={mode} onChange={(m) => void setSortMode(listId, m)} />
          {mode === 'custom' && <p className="mt-2 text-sm text-muted">Attrape la poignée ⋮⋮ d'un article et fais-le glisser.</p>}
        </div>
        <div>
          <span className="mb-2 block text-sm font-medium text-muted">Articles pris</span>
          <Segmented options={COMPLETED} value={completedDisplay} onChange={setCompletedDisplay} />
        </div>
        <div>
          <span className="mb-2 block text-sm font-medium text-muted">Liste favorite</span>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" disabled={!itemCount} onClick={() => void saveFavorite()}>
              <Star size={18} className="text-[#E0B04B]" /> {hasFavorite ? 'Mettre à jour le favori' : 'Enregistrer en favori'}
            </Button>
            <Button variant="outline" onClick={() => { onClose(); onPickFavorite(); }}>
              <CopyPlus size={18} /> Ajouter un favori
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" disabled={!doneCount} onClick={() => { void uncheckAll(listId); onClose(); }}>
            <ListChecks size={18} /> Tout décocher
          </Button>
          <Button variant="danger-outline" disabled={!doneCount} onClick={() => void removeDone()}>
            Retirer les pris
          </Button>
        </div>
        <div className="border-t border-line pt-3">
          <DeleteListButton listId={listId} title={listTitle} onDeleted={onClose} />
        </div>
      </div>
    </Sheet>
  );
}
