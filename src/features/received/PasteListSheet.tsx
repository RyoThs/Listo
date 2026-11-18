import { useMemo, useState } from 'react';
import { ClipboardPaste, ListPlus } from 'lucide-react';
import { Sheet } from '../../components/ui/Sheet';
import { Button } from '../../components/ui/Button';
import { readListLink, ListLinkError, type SharedList } from '../../lib/listLink';
import { SharedListPreview } from './SharedListPreview';
import { useAddSharedList } from './useAddSharedList';

/** « Coller une liste reçue » : on colle le message (ou juste le lien) reçu, LISTO retrouve la liste. */
export function PasteListSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} title="Coller une liste reçue">
      <PasteList onClose={onClose} />
    </Sheet>
  );
}

type Reading = { shared: SharedList } | { error: string } | null;

function read(text: string): Reading {
  if (!text.trim()) return null;
  try {
    const shared = readListLink(text);
    return shared ? { shared } : { error: 'Aucun lien LISTO trouvé. Colle le message en entier, avec la ligne « Ouvrir dans LISTO ».' };
  } catch (e) {
    return { error: e instanceof ListLinkError ? e.message : 'Ce lien de liste est illisible.' };
  }
}

function PasteList({ onClose }: { onClose: () => void }) {
  const [text, setText] = useState('');
  const reading = useMemo(() => read(text), [text]);
  const { add, busy } = useAddSharedList(onClose);
  const canPaste = typeof navigator !== 'undefined' && !!navigator.clipboard?.readText;

  const paste = async () => {
    try { setText(await navigator.clipboard.readText()); } catch { /* refusé : on colle à la main dans la case */ }
  };

  return (
    <div className="space-y-4 pb-2">
      <p className="text-[15px] text-muted">Dans ta messagerie, appuie longtemps sur le message reçu, choisis « Copier », puis colle-le ici.</p>
      {canPaste && (
        <Button variant="outline" className="w-full" onClick={() => void paste()}>
          <ClipboardPaste size={18} /> Coller
        </Button>
      )}
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-muted">Message reçu</span>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={4} placeholder="🛒 Courses… 📲 Ouvrir dans LISTO : https://…"
          className="w-full rounded-xl border border-line bg-cream p-3 text-base outline-none focus:border-sage focus:ring-2 focus:ring-sage/25" />
      </label>
      {reading && 'error' in reading && <p role="alert" className="rounded-2xl bg-[#F8E1DE] p-3 text-[15px] text-danger">{reading.error}</p>}
      {reading && 'shared' in reading && (
        <>
          <SharedListPreview shared={reading.shared} />
          <Button className="w-full" disabled={busy} onClick={() => void add(reading.shared)}>
            <ListPlus size={18} /> Ajouter à mes listes
          </Button>
        </>
      )}
    </div>
  );
}
