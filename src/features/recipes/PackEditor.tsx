import { useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Field } from '../../components/ui/Field';
import { createPack } from '../../db/actions';
import { parseEntry, splitEntries } from '../../lib/parse';
import { ERROR_MESSAGE, reportError } from '../../lib/errors';
import { useUI } from '../../stores/ui';

/** Créer un pack sans passer par une liste : un nom + les ingrédients. */
export function PackEditor({ onDone }: { onDone: () => void }) {
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const showToast = useUI((s) => s.showToast);
  const count = splitEntries(text).map(parseEntry).filter((e) => e.name).length;

  const save = async () => {
    try {
      await createPack(title, text);
      showToast(`Pack « ${title.trim()} » créé ⭐`);
      onDone();
    } catch (e) {
      if (e instanceof Error && /nom|ingrédient/.test(e.message)) return setError(e.message);
      reportError(e, 'Nouveau pack');
      setError(ERROR_MESSAGE);
    }
  };

  return (
    <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void save(); }}>
      <Field label="Nom du pack" value={title} onChange={(e) => { setTitle(e.target.value); setError(null); }} placeholder="Ex. Lasagnes, Apéro, Petit-déj…" maxLength={40} autoFocus />
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-muted">Articles (un par ligne, ou séparés par des virgules)</span>
        <textarea value={text} onChange={(e) => { setText(e.target.value); setError(null); }} rows={5} placeholder={'pâtes à lasagne\n500 g de viande hachée\nsauce tomate, fromage râpé'}
          className="w-full rounded-xl border border-line bg-cream p-3 text-base outline-none focus:border-sage focus:ring-2 focus:ring-sage/25" />
      </label>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      <Button type="submit" className="w-full">Créer le pack{count ? ` (${count} article${count > 1 ? 's' : ''})` : ''}</Button>
      <Button type="button" variant="ghost" className="w-full" onClick={onDone}>Annuler</Button>
    </form>
  );
}
