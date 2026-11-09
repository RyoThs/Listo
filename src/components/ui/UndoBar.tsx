import { Undo2 } from 'lucide-react';
import { useUI } from '../../stores/ui';

/** Bandeau « Article retiré · Annuler », 6 secondes pour changer d'avis. */
export function UndoBar() {
  const { undo, clearUndo, currentListId } = useUI();
  if (!undo) return null;
  return (
    <div className={`fixed inset-x-0 z-[55] flex justify-center px-3 ${currentListId ? 'bottom-[calc(5.5rem+env(safe-area-inset-bottom))]' : 'bottom-[calc(5.75rem+env(safe-area-inset-bottom))]'}`}>
      <div role="status" className="flex w-full max-w-md items-center gap-3 rounded-2xl bg-ink py-2 pr-2 pl-4 text-white shadow-xl">
        <span className="min-w-0 flex-1 truncate text-[15px]">{undo.message}</span>
        <button
          onClick={async () => { const run = undo.run; clearUndo(); await run(); }}
          className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl bg-white/15 px-3 text-sm font-bold text-[#BFE3CB] active:bg-white/25">
          <Undo2 size={16} /> Annuler
        </button>
      </div>
    </div>
  );
}
