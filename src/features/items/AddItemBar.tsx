import { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, ArrowUp } from 'lucide-react';
import { addItem, findSuggestions } from '../../db/actions';
import { parseEntry, splitEntries } from '../../lib/parse';
import { getCategory } from '../../lib/categories';
import { useSpeech } from '../voice/useSpeech';
import { haptic } from '../../lib/device';
import type { Suggestion } from '../../types';

/** Barre d'ajout toujours visible en bas : clavier, suggestions et micro. */
export function AddItemBar({ listId, existingNames }: { listId: string; existingNames: string[] }) {
  const [text, setText] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const addText = async (raw: string) => {
    const parts = splitEntries(raw);
    const added: string[] = [];
    for (const p of parts) {
      const e = parseEntry(p);
      if (!e.name) continue;
      const item = await addItem(listId, e);
      if (item) added.push(item.name);
    }
    if (added.length) {
      haptic(8);
      setToast(added.length === 1 ? `${added[0]} ajouté` : `${added.length} articles ajoutés`);
    }
  };

  const speech = useSpeech((spoken) => void addText(spoken));

  useEffect(() => {
    let alive = true;
    const q = parseEntry(text).name;
    if (!q) { setSuggestions([]); return; }
    findSuggestions(q, existingNames).then((s) => alive && setSuggestions(s));
    return () => { alive = false; };
  }, [text, existingNames]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 1800);
    return () => clearTimeout(t);
  }, [toast]);

  // On vide le champ TOUT DE SUITE, puis on ajoute en arrière-plan.
  // (Avant : le champ était vidé à la fin de l'ajout et pouvait effacer ce qu'on tapait déjà ensuite.)
  const submit = () => {
    const value = text.trim();
    if (!value) return;
    setText('');
    inputRef.current?.focus(); // le clavier reste ouvert pour enchaîner
    void addText(value);
  };

  const pick = (s: Suggestion) => {
    const { quantity, unit } = parseEntry(text);
    setText('');
    inputRef.current?.focus();
    haptic(8);
    void addItem(listId, { name: s.name, category: s.category, unit: unit ?? s.unit, quantity });
  };

  const value = speech.listening ? speech.interim || 'Je t’écoute…' : text;

  return (
    <div className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-line bg-cream/95 px-3 pt-2 backdrop-blur">
      <div className="mx-auto max-w-lg">
        {(toast || speech.error) && (
          <p role="status" className={`mb-2 text-center text-sm ${speech.error ? 'text-danger' : 'text-sage-dark'}`}>{speech.error ?? toast}</p>
        )}
        {suggestions.length > 0 && !speech.listening && (
          <div className="mb-2 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]" role="listbox" aria-label="Suggestions">
            {suggestions.map((s) => {
              const c = getCategory(s.category);
              return (
                <button key={s.key} role="option" aria-selected={false} onClick={() => pick(s)} onMouseDown={(e) => e.preventDefault()}
                  className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full border border-line bg-card px-3 text-sm font-medium">
                  <span className="size-2 rounded-full" style={{ background: c.color }} /> {s.name}
                </button>
              );
            })}
          </div>
        )}
        <form className="flex items-center gap-2" onSubmit={(e) => { e.preventDefault(); submit(); }}>
          <input ref={inputRef} value={value} onChange={(e) => setText(e.target.value)} readOnly={speech.listening}
            placeholder="Ajouter un article…" aria-label="Ajouter un article" enterKeyHint="send" autoComplete="off" autoCapitalize="sentences"
            className="min-h-12 min-w-0 flex-1 rounded-2xl border border-line bg-card px-4 text-base outline-none focus:border-sage focus:ring-2 focus:ring-sage/25" />
          {speech.supported && (
            <button type="button" onClick={speech.listening ? speech.stop : speech.start} aria-label={speech.listening ? 'Arrêter la dictée' : 'Dicter des articles'}
              className={`flex size-12 shrink-0 items-center justify-center rounded-2xl ${speech.listening ? 'animate-pulse bg-danger text-white' : 'border border-line bg-card text-sage'}`}>
              {speech.listening ? <MicOff size={22} /> : <Mic size={22} />}
            </button>
          )}
          <button type="submit" aria-label="Ajouter" disabled={!text.trim() || speech.listening}
            className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-sage text-white disabled:opacity-35">
            <ArrowUp size={22} />
          </button>
        </form>
      </div>
    </div>
  );
}
