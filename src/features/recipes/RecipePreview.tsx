import { useMemo, useState } from 'react';
import { ArrowLeft, Minus, Plus, Star } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { addIngredientsToList, saveRecipeAsPack } from '../../db/actions';
import { scaleIngredients } from '../../lib/recipes/scale';
import { MAX_PERSONS, MIN_PERSONS, type Recipe } from '../../lib/recipes/types';
import { formatQuantity } from '../../lib/format';
import { haptic } from '../../lib/device';
import { ERROR_MESSAGE, reportError } from '../../lib/errors';
import { useUI } from '../../stores/ui';

type Props = { recipe: Recipe; listId: string; onBack: () => void; onDone: () => void };

/** Aperçu d'un plat : nombre de personnes, ingrédients à cocher, puis « Ajouter à la liste ». */
export function RecipePreview({ recipe, listId, onBack, onDone }: Props) {
  const { persons, setPersons, showToast } = useUI();
  const ingredients = useMemo(() => scaleIngredients(recipe, persons), [recipe, persons]);
  // Les ingrédients des placards (sel, huile…) ne sont pas cochés d'office.
  const [skipped, setSkipped] = useState(() => new Set(recipe.ingredients.flatMap((i, n) => (i.pantry ? [n] : []))));
  const [busy, setBusy] = useState(false);
  const chosen = ingredients.filter((_, n) => !skipped.has(n));
  const drafts = chosen.map(({ name, quantity, unit }) => ({ name, quantity, unit }));
  const approx = recipe.source === 'mealdb';

  const toggle = (n: number) => setSkipped((s) => { const next = new Set(s); if (next.has(n)) next.delete(n); else next.add(n); return next; });

  const run = async (action: () => Promise<string>) => {
    setBusy(true);
    try {
      const message = await action();
      haptic();
      showToast(message);
      onDone();
    } catch (e) {
      reportError(e, 'Recette');
      showToast(e instanceof Error && /nom|ingrédient/.test(e.message) ? e.message : ERROR_MESSAGE);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3 pb-2">
      <button onClick={onBack} className="-ml-1 inline-flex min-h-10 items-center gap-1 text-sm font-medium text-sage-dark">
        <ArrowLeft size={18} /> Retour aux recettes
      </button>
      <div className="flex items-center gap-3">
        {recipe.image
          ? <img src={recipe.image} alt="" className="size-16 shrink-0 rounded-xl object-cover" />
          : <span className="flex size-16 shrink-0 items-center justify-center rounded-xl bg-cream text-3xl">{recipe.emoji ?? '🍽️'}</span>}
        <h3 className="text-lg leading-snug font-bold">{recipe.title}</h3>
      </div>

      <div className="flex items-center justify-between rounded-2xl bg-cream p-2 pl-4">
        <span className="font-medium">Pour <b className="tabular-nums">{persons}</b> personne{persons > 1 ? 's' : ''}</span>
        <div className="flex items-center gap-1">
          <button aria-label="Une personne de moins" disabled={persons <= MIN_PERSONS} onClick={() => setPersons(persons - 1)}
            className="flex size-11 items-center justify-center rounded-full bg-card disabled:opacity-30"><Minus size={18} /></button>
          <button aria-label="Une personne de plus" disabled={persons >= MAX_PERSONS} onClick={() => setPersons(persons + 1)}
            className="flex size-11 items-center justify-center rounded-full bg-card text-sage"><Plus size={18} /></button>
        </div>
      </div>
      {approx && <p className="text-xs text-muted">Recette en ligne (TheMealDB, en anglais) : quantités prévues pour 4 et adaptées quand c’est possible.</p>}

      <ul className="overflow-hidden rounded-2xl border border-line">
        {ingredients.map((i, n) => {
          const on = !skipped.has(n);
          const qty = formatQuantity(i.quantity, i.unit);
          return (
            <li key={n} className="border-b border-line last:border-b-0">
              <label className="flex min-h-12 items-center gap-3 px-3 py-2">
                <input type="checkbox" checked={on} onChange={() => toggle(n)} className="size-5 shrink-0 accent-sage" />
                <span className={`min-w-0 flex-1 ${on ? '' : 'text-muted'}`}>
                  {i.name} {qty && <span className="font-mono text-sm text-muted">{qty}</span>}
                  {(i.pantry || (approx && i.note && !i.unit)) && (
                    <span className="block text-xs text-muted">{i.pantry ? 'Placard : tu en as sûrement' : ''}{i.pantry && approx && i.note ? ' · ' : ''}{approx && i.note ? i.note : ''}</span>
                  )}
                </span>
              </label>
            </li>
          );
        })}
      </ul>

      <Button className="w-full" disabled={!chosen.length || busy}
        onClick={() => void run(async () => {
          const n = await addIngredientsToList(listId, drafts);
          return `${n} ingrédient${n > 1 ? 's' : ''} de « ${recipe.title} » ajouté${n > 1 ? 's' : ''}`;
        })}>
        Ajouter {chosen.length} ingrédient{chosen.length > 1 ? 's' : ''} à la liste
      </Button>
      <Button variant="ghost" className="w-full" disabled={!chosen.length || busy}
        onClick={() => void run(async () => { await saveRecipeAsPack(recipe.title, drafts); return `« ${recipe.title} » gardé dans tes packs ⭐`; })}>
        <Star size={18} className="text-[#E0B04B]" /> Garder dans mes packs
      </Button>
    </div>
  );
}
