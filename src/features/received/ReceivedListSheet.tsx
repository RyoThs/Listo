import { ListPlus, Info } from 'lucide-react';
import { Sheet } from '../../components/ui/Sheet';
import { Button } from '../../components/ui/Button';
import { isStandalone } from '../../lib/device';
import { SharedListPreview } from './SharedListPreview';
import { useAddSharedList } from './useAddSharedList';
import type { SharedList } from '../../lib/listLink';

/** Fenêtre « Liste reçue » : s'ouvre quand on touche le lien « Ouvrir dans LISTO » d'un message. */
export function ReceivedListSheet({ shared, onClose }: { shared: SharedList | null; onClose: () => void }) {
  return (
    <Sheet open={!!shared} onClose={onClose} title="Liste reçue">
      {shared && <ReceivedList shared={shared} onClose={onClose} />}
    </Sheet>
  );
}

function ReceivedList({ shared, onClose }: { shared: SharedList; onClose: () => void }) {
  const { add, busy } = useAddSharedList(onClose);
  return (
    <div className="space-y-4 pb-2">
      <p className="text-[15px] text-muted">On t'a envoyé cette liste. Tu veux l'ajouter à tes listes ?</p>
      <SharedListPreview shared={shared} />
      <Button className="w-full" disabled={busy} onClick={() => void add(shared)}>
        <ListPlus size={18} /> Ajouter à mes listes
      </Button>
      {/* iPhone : un lien s'ouvre dans Safari, qui ne voit pas les listes de l'appli posée sur l'écran d'accueil. */}
      {!isStandalone() && <BrowserHint />}
      <Button variant="ghost" className="w-full" onClick={onClose}>Non merci</Button>
    </div>
  );
}

function BrowserHint() {
  return (
    <p className="flex gap-2 rounded-2xl bg-[#FBF0DC] p-3 text-sm text-[#7A5512]">
      <Info size={18} className="mt-0.5 shrink-0" />
      <span>
        Tu as LISTO sur ton écran d'accueil ? Ici, la liste sera ajoutée dans le navigateur.
        Pour l'avoir dans l'appli : copie le message reçu, ouvre LISTO, touche « Nouvelle liste » puis « Coller une liste reçue ».
      </span>
    </p>
  );
}
