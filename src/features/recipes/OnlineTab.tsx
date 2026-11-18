import { useState } from 'react';
import { Loader2, Search, WifiOff } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { getMeal, searchMeals, type MealSummary } from '../../lib/recipes/mealdb';
import { reportError } from '../../lib/errors';
import type { Recipe } from '../../lib/recipes/types';
import { RecipeRow } from './RecipeRow';

type State =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'results'; results: MealSummary[] }
  | { kind: 'offline' };

/** Recherche dans TheMealDB (≈ 800 recettes, en anglais ; internet nécessaire). */
export function OnlineTab({ onPick }: { onPick: (r: Recipe) => void }) {
  const [query, setQuery] = useState('');
  const [state, setState] = useState<State>({ kind: 'idle' });
  const [opening, setOpening] = useState<string | null>(null);

  const search = async () => {
    if (!query.trim()) return;
    setState({ kind: 'loading' });
    try {
      const r = await searchMeals(query);
      setState(r.status === 'ok' ? { kind: 'results', results: r.results } : { kind: 'offline' });
    } catch (e) {
      reportError(e, 'Recettes en ligne');
      setState({ kind: 'offline' });
    }
  };

  const open = async (id: string) => {
    setOpening(id);
    try {
      const r = await getMeal(id);
      if (r.status === 'ok') onPick(r.recipe);
      else setState({ kind: 'offline' });
    } catch (e) {
      reportError(e, 'Recette en ligne');
      setState({ kind: 'offline' });
    } finally {
      setOpening(null);
    }
  };

  return (
    <>
      <form className="mb-2 flex gap-2" onSubmit={(e) => { e.preventDefault(); void search(); }}>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="lasagne, poulet, curry…" aria-label="Chercher une recette en ligne"
          enterKeyHint="search" className="min-h-12 min-w-0 flex-1 rounded-xl border border-line bg-cream px-3 text-base outline-none focus:border-sage focus:ring-2 focus:ring-sage/25" />
        <Button type="submit" aria-label="Chercher" disabled={!query.trim() || state.kind === 'loading'}><Search size={18} /></Button>
      </form>
      <p className="mb-3 text-xs text-muted">Recettes de TheMealDB (base gratuite, en anglais). Cherche un plat en anglais ou un ingrédient en français.</p>

      {state.kind === 'loading' && <p className="flex items-center justify-center gap-2 p-6 text-muted"><Loader2 className="animate-spin" size={20} /> Recherche…</p>}
      {state.kind === 'offline' && (
        <p className="flex items-start gap-3 rounded-2xl bg-cream p-4 text-[15px]"><WifiOff className="mt-0.5 shrink-0 text-danger" size={20} /> Pas d’internet (ou le site ne répond pas). Les « Idées de plats » marchent sans réseau.</p>
      )}
      {state.kind === 'results' && state.results.length === 0 && <p className="rounded-2xl bg-cream p-4 text-muted">Aucune recette trouvée. Essaie un autre mot (en anglais : « beef », « soup »…).</p>}
      {state.kind === 'results' && (
        <ul className="space-y-2">
          {state.results.map((m) => (
            <RecipeRow key={m.id} title={m.title} image={m.image} subtitle={opening === m.id ? 'Ouverture…' : undefined} onClick={() => void open(m.id)} />
          ))}
        </ul>
      )}
    </>
  );
}
