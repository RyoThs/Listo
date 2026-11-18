import { useRef, useState } from 'react';
import { ImagePlus, Trash2 } from 'lucide-react';
import { Sheet } from '../../components/ui/Sheet';
import { Field } from '../../components/ui/Field';
import { Button } from '../../components/ui/Button';
import { ColorPicker } from '../../components/ui/ColorPicker';
import { Segmented } from '../../components/ui/Segmented';
import { LIST_COLORS } from '../../lib/listIcons';
import { preparePhoto } from '../../lib/photo';
import { barcodeProblem, makeBarcode, FORMAT_LABELS, type BarcodeFormat } from '../../lib/barcode';
import { deleteCard, restoreCard, saveCard } from '../../db/cards';
import { useUI } from '../../stores/ui';
import type { LoyaltyCard, StoredPhoto } from '../../types';
import { usePhotoUrl } from './usePhotoUrl';
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
  const [photo, setPhoto] = useState<StoredPhoto | undefined>(card?.photo);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const { offerUndo, showToast } = useUI();

  const problem = barcodeProblem(number, format);
  const detected = makeBarcode(number, format)?.format;
  const canSave = name.trim().length > 0 && (!!photo || number.trim().length > 0) && !busy;

  const save = async () => {
    if (!canSave) return;
    await saveCard({ name, color, photo, number, format }, card?.id);
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
            {detected ? (
              <div className="rounded-xl border border-line bg-white p-3">
                <BarcodeView number={number} format={format} className="h-20" />
                <p className="pt-1 text-center text-xs text-muted">Aperçu · {FORMAT_LABELS[detected]}</p>
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

      <PhotoPicker photo={photo} onChange={setPhoto} busy={busy} setBusy={setBusy} setError={setError} />
      <ColorPicker value={color} onChange={setColor} />

      {error && <p role="alert" className="rounded-xl bg-[#F8E1DE] p-3 text-[15px] text-danger">{error}</p>}
      {!canSave && !busy && name.trim() && <p className="text-sm text-muted">Entre le numéro (ou ajoute une photo) pour enregistrer.</p>}

      <Button type="submit" className="w-full" disabled={!canSave}>{card ? 'Enregistrer' : 'Ajouter la carte'}</Button>
      {card && (
        <Button type="button" variant={confirm ? 'danger' : 'ghost'} className={`w-full ${confirm ? '' : 'text-danger'}`} onClick={() => void remove()}>
          <Trash2 size={18} /> {confirm ? 'Confirmer la suppression' : 'Supprimer la carte'}
        </Button>
      )}
    </form>
  );
}

/** Photo de la carte, facultative (utile si la carte n'a pas de numéro lisible). */
function PhotoPicker({ photo, onChange, busy, setBusy, setError }: {
  photo?: StoredPhoto; onChange: (p?: StoredPhoto) => void; busy: boolean; setBusy: (b: boolean) => void; setError: (e: string | null) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const preview = usePhotoUrl(photo);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true); setError(null);
    try {
      onChange(await preparePhoto(file));
    } catch (e) {
      setError(e instanceof Error && e.message === 'too-big' ? 'Cette photo est trop lourde. Essaie une capture d’écran de la photo.' : 'Impossible de lire cette image. Choisis une photo (JPEG ou PNG).');
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div>
      <span className="mb-2 block text-sm font-medium text-muted">Photo de la carte (facultatif)</span>
      {/* Sans « capture » : l'iPhone propose Photothèque, Prendre une photo ou Fichiers. */}
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => void pick(e.target.files?.[0])} aria-label="Choisir la photo de la carte" />
      {preview ? (
        <div className="space-y-2">
          <img src={preview} alt="Aperçu de la carte" className="max-h-40 w-full rounded-xl border border-line bg-cream object-contain" />
          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant="outline" disabled={busy} onClick={() => fileRef.current?.click()}><ImagePlus size={18} /> Changer</Button>
            <Button type="button" variant="outline" className="text-danger" onClick={() => onChange(undefined)}>Retirer</Button>
          </div>
        </div>
      ) : (
        <button type="button" disabled={busy} onClick={() => fileRef.current?.click()}
          className="flex min-h-14 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-line text-[15px] font-medium text-sage-dark active:bg-cream disabled:opacity-50">
          <ImagePlus size={20} /> {busy ? 'Préparation…' : 'Ajouter une photo'}
        </button>
      )}
    </div>
  );
}
