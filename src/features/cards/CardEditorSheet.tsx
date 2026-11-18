import { useEffect, useRef, useState } from 'react';
import { Check, ImagePlus, Trash2 } from 'lucide-react';
import { Sheet } from '../../components/ui/Sheet';
import { Field } from '../../components/ui/Field';
import { Button } from '../../components/ui/Button';
import { LIST_COLORS } from '../../lib/listIcons';
import { preparePhoto } from '../../lib/photo';
import { deleteCard, restoreCard, saveCard } from '../../db/cards';
import { useUI } from '../../stores/ui';
import type { LoyaltyCard, StoredPhoto } from '../../types';
import { usePhotoUrl } from './CardsStrip';

/** Ajouter une carte (card absent) ou la modifier / supprimer (card présent). */
export function CardEditorSheet({ open, card, onClose }: { open: boolean; card?: LoyaltyCard; onClose: () => void }) {
  const [name, setName] = useState('');
  const [color, setColor] = useState(LIST_COLORS[0]);
  const [photo, setPhoto] = useState<StoredPhoto | undefined>();
  const [number, setNumber] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { offerUndo, showToast } = useUI();
  const preview = usePhotoUrl(photo ? { photo } : null);

  useEffect(() => {
    if (!open) return;
    setName(card?.name ?? '');
    setColor(card?.color ?? LIST_COLORS[0]);
    setPhoto(card?.photo);
    setNumber(card?.number ?? '');
    setError(null);
    setConfirm(false);
  }, [open, card]);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true); setError(null);
    try {
      setPhoto(await preparePhoto(file));
    } catch (e) {
      setError(e instanceof Error && e.message === 'too-big' ? 'Cette photo est trop lourde. Essaie une capture d’écran de la photo.' : 'Impossible de lire cette image. Choisis une photo (JPEG ou PNG).');
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const canSave = name.trim().length > 0 && (!!photo || number.trim().length > 0) && !busy;

  const save = async () => {
    if (!canSave) return;
    await saveCard({ name, color, photo, number }, card?.id);
    showToast(card ? 'Carte modifiée' : 'Carte ajoutée 💳');
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} title={card ? 'Modifier la carte' : 'Nouvelle carte de fidélité'}>
      <form className="space-y-4 pb-2" onSubmit={(e) => { e.preventDefault(); void save(); }}>
        <Field label="Magasin" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex. Carrefour, Leclerc, Lidl…" maxLength={40} enterKeyHint="done" autoFocus={!card} />

        <div>
          <span className="mb-2 block text-sm font-medium text-muted">Photo de la carte</span>
          {/* Sans « capture » : l'iPhone propose Photothèque, Prendre une photo ou Fichiers. */}
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => void pick(e.target.files?.[0])} aria-label="Choisir la photo de la carte" />
          {preview ? (
            <div className="space-y-2">
              <img src={preview} alt="Aperçu de la carte" className="max-h-56 w-full rounded-xl border border-line bg-cream object-contain" />
              <div className="grid grid-cols-2 gap-2">
                <Button type="button" variant="outline" disabled={busy} onClick={() => fileRef.current?.click()}><ImagePlus size={18} /> Changer</Button>
                <Button type="button" variant="outline" className="text-danger" onClick={() => setPhoto(undefined)}>Retirer</Button>
              </div>
            </div>
          ) : (
            <button type="button" disabled={busy} onClick={() => fileRef.current?.click()}
              className="flex min-h-28 w-full flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-sage/60 bg-sage-soft/50 text-sage-dark active:bg-sage-soft disabled:opacity-50">
              <ImagePlus size={26} />
              <span className="font-semibold">{busy ? 'Préparation…' : 'Choisir une photo'}</span>
              <span className="text-sm text-muted">dans tes photos, ou en prendre une</span>
            </button>
          )}
          <p className="mt-1.5 text-sm text-muted">Astuce : cadre bien le code-barres, sans reflet.</p>
        </div>

        <Field label="Numéro de la carte (facultatif)" value={number} onChange={(e) => setNumber(e.target.value)} placeholder="Le numéro sous le code-barres" inputMode="numeric" maxLength={60} autoComplete="off" />

        <div>
          <span className="mb-2 block text-sm font-medium text-muted">Couleur</span>
          <div className="flex flex-wrap gap-2.5">
            {LIST_COLORS.map((c) => (
              <button type="button" key={c} onClick={() => setColor(c)} aria-label={`Couleur ${c}`} aria-pressed={color === c}
                className="flex size-10 items-center justify-center rounded-full ring-offset-2 aria-pressed:ring-2 aria-pressed:ring-ink" style={{ background: c }}>
                {color === c && <Check size={18} className="text-white" />}
              </button>
            ))}
          </div>
        </div>

        {error && <p role="alert" className="rounded-xl bg-[#F8E1DE] p-3 text-[15px] text-danger">{error}</p>}
        {!canSave && !busy && name.trim() && <p className="text-sm text-muted">Ajoute une photo ou un numéro pour enregistrer.</p>}

        <Button type="submit" className="w-full" disabled={!canSave}>{card ? 'Enregistrer' : 'Ajouter la carte'}</Button>

        {card && (
          <Button type="button" variant={confirm ? 'danger' : 'ghost'} className={`w-full ${confirm ? '' : 'text-danger'}`}
            onClick={async () => {
              if (!confirm) return setConfirm(true);
              await deleteCard(card.id);
              offerUndo(`Carte « ${card.name} » supprimée`, () => restoreCard(card.id));
              onClose();
            }}>
            <Trash2 size={18} /> {confirm ? 'Confirmer la suppression' : 'Supprimer la carte'}
          </Button>
        )}
      </form>
    </Sheet>
  );
}
