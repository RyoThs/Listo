import { useState } from 'react';
import { CookingPot } from 'lucide-react';
import { RecipesSheet } from './RecipesSheet';

/** Bouton « Recettes » au-dessus de la barre d'ajout (toujours visible hors mode Magasin). */
export function RecipesButton({ listId }: { listId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} onMouseDown={(e) => e.preventDefault()}
        className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full bg-sage-soft px-3 text-sm font-semibold text-sage-dark">
        <CookingPot size={16} /> Recettes
      </button>
      <RecipesSheet open={open} listId={listId} onClose={() => setOpen(false)} />
    </>
  );
}
