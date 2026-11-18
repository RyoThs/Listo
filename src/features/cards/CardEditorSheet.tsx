import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Sheet } from '../../components/ui/Sheet';
import { Field } from '../../components/ui/Field';
import { Button } from '../../components/ui/Button';
import { ColorPicker } from '../../components/ui/ColorPicker';
import { Segmented } from '../../components/ui/Segmented';
import { LIST_COLORS } from '../../lib/listIcons';
import { barcodeProblem, makeBarcode, FORMAT_LABELS, type BarcodeFormat } from '../../lib/barcode';
import { deleteCard, restoreCard, saveCard } from '../../db/cards';
import { useUI } from '../../stores/ui';
import type { LoyaltyCard } from '../../types';
import { BarcodeView } from './BarcodeView';

const FORMATS = (Object.keys(FORMAT_LABELS) as BarcodeFormat[]).map((id) => ({ id, label: FORMAT_LABELS[id] }));

type Props = { open: boolean; card?: LoyaltyCard; onClose: () => void };

/** Ajouter une carte (card absent) ou la modifier / supprimer (card présent). */
export function CardEditorSheet({ open, card, onClose }: Props) {
  return (
    <Sheet open={open} onClose={onClose} title={card ? 'Modifier la carte' : 'Nouvelle carte de fidélité'}>
      <CardEditor card={card} onClose={onClose} />
    </Sheet>
  );
}

/** Le formulaire (préparé seulement à l'ouverture : il démarre avec les valeurs de la carte). */
function CardEditor({ card, onClose }: Omit<Props, 'open'>) {
  const [name, setName] = useState(card?.name ?? '');
  const [number, setNumber] = useState(card?.number ?? '');
  const [format, setFormat] = useState<BarcodeFormat>(card?.format ?? 'auto');
  const [color, setColor] = useState(card?.color ?? LIST_COLORS[0]);
  const [confirm, setConfirm] = useState(false);
  const { offerUndo, showToast } = useUI();

  const barcode = makeBarcode(number, format);
  const problem = barcodeProblem(number, format);
  // On n'enregistre qu'une carte dont la caisse pourra lire le code.
  const canSave = name.trim().length > 0 && !!barcode;

  const save = async () => {
    if (!canSave) return;
    await saveCard({ name, color, number, format }, card?.id);
    showToast(card ? 'Carte modifiée' : 'Carte ajoutée 💳');
    onClose();
  };

  const remove = async () => {
    if (!card) return;
    if (!confirm) return setConfirm(true);
    await deleteCard(card.id);
    offerUndo(`Carte « ${card.name} » supprimée`, () => restoreCard(card.id));
    onClose();
  };

  return (
    <form className="space-y-4 pb-2" onSubmit={(e) => { e.preventDefault(); void save(); }}>
      <Field label="Magasin" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex. Carrefour, Leclerc, Lidl…" maxLength={40} enterKeyHint="next" autoFocus={!card} />

      <div className="space-y-2">
        <Field label="Numéro de la carte" value={number} onChange={(e) => setNumber(e.target.value)} placeholder="Les chiffres sous le code-barres"
          inputMode="numeric" maxLength={60} autoComplete="off" className="font-mono tracking-wider" />
        {number.trim() && (
          <>
            {/* Aperçu en direct : c'est ce que verra la caisse. */}
            {barcode ? (
              <div className="rounded-xl border border-line bg-white p-3">
                <BarcodeView number={number} format={format} className="h-20" />
                <p className="pt-1 text-center text-xs text-muted">Aperçu · {FORMAT_LABELS[barcode.format]}</p>
              </div>
            ) : (
              <p role="alert" className="rounded-xl bg-[#F8E1DE] p-3 text-[15px] text-danger">{problem}</p>
            )}
            <div>
              <span className="mb-1 block text-sm font-medium text-muted">Type de code-barres</span>
              <Segmented options={FORMATS} value={format} onChange={setFormat} />
              <p className="mt-1.5 text-sm text-muted">Laisse « Automatique ». Si la caisse ne lit pas, essaie l'autre type.</p>
            </div>
          </>
        )}
      </div>

      <ColorPicker value={color} onChange={setColor} />

      {!canSave && name.trim() && !number.trim() && <p className="text-sm text-muted">Tape le numéro de la carte pour l'enregistrer.</p>}
      <Button type="submit" className="w-full" disabled={!canSave}>{card ? 'Enregistrer' : 'Ajouter la carte'}</Button>
      {card && (
        <Button type="button" variant={confirm ? 'danger' : 'ghost'} className={`w-full ${confirm ? '' : 'text-danger'}`} onClick={() => void remove()}>
          <Trash2 size={18} /> {confirm ? 'Confirmer la suppression' : 'Supprimer la carte'}
        </Button>
      )}
    </form>
  );
}
