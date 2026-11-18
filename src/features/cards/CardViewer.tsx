import { useState } from 'react';
import { X, RotateCw, Pencil, Image, Barcode } from 'lucide-react';
import { useBackHandler } from '../../lib/backButton';
import { makeBarcode } from '../../lib/barcode';
import { IconButton, Button } from '../../components/ui/Button';
import type { LoyaltyCard } from '../../types';
import { usePhotoUrl } from './usePhotoUrl';
import { useWakeLock } from './useWakeLock';
import { BarcodeView } from './BarcodeView';

type Props = { card: LoyaltyCard | null; onClose: () => void; onEdit: (c: LoyaltyCard) => void };

/**
 * La carte en plein écran, sur fond blanc, pour la caisse.
 * Avec un numéro : LISTO dessine un code-barres net. Sans numéro : la photo.
 */
export function CardViewer({ card, onClose, onEdit }: Props) {
  useBackHandler(!!card, onClose);
  useWakeLock(!!card);
  if (!card) return null;
  // key : on repart de zéro (pas tourné, code affiché) à chaque carte ouverte.
  return <CardScreen key={card.id} card={card} onClose={onClose} onEdit={onEdit} />;
}

function CardScreen({ card, onClose, onEdit }: { card: LoyaltyCard; onClose: () => void; onEdit: (c: LoyaltyCard) => void }) {
  const photoUrl = usePhotoUrl(card.photo);
  const hasBarcode = !!card.number && !!makeBarcode(card.number, card.format);
  const [showPhoto, setShowPhoto] = useState(!hasBarcode);
  const [turned, setTurned] = useState(false);

  return (
    <div className="pt-safe pb-safe fixed inset-0 z-50 flex flex-col bg-white text-ink" role="dialog" aria-modal="true" aria-label={`Carte ${card.name}`}>
      <div className="flex items-center gap-2 px-3 py-2">
        <span className="size-3 shrink-0 rounded-full" style={{ background: card.color }} />
        <h2 className="min-w-0 flex-1 truncate text-xl font-bold">{card.name}</h2>
        <IconButton label="Fermer" onClick={onClose}><X size={24} /></IconButton>
      </div>

      <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden px-3">
        <div className="flex w-full items-center justify-center transition-transform duration-300"
          style={turned ? { transform: 'rotate(90deg)', width: 'min(calc(100dvh - 260px), 640px)' } : undefined}>
          {showPhoto ? (
            photoUrl
              ? <img src={photoUrl} alt={`Photo de la carte ${card.name}`} className="max-h-[60dvh] max-w-full rounded-xl object-contain" />
              : <p className="text-center text-muted">Pas de photo pour cette carte.</p>
          ) : (
            <div className="w-full">
              <BarcodeView number={card.number!} format={card.format} className="h-36" />
              <p className="pt-2 text-center font-mono text-2xl font-bold tracking-wider break-all">{card.number}</p>
            </div>
          )}
        </div>
      </div>

      {showPhoto && card.number && !hasBarcode && (
        <p className="px-4 pt-3 text-center font-mono text-2xl font-bold tracking-wider break-all select-all">{card.number}</p>
      )}
      <p className="px-4 pt-2 text-center text-sm text-muted">Monte la luminosité si la caisse a du mal à lire.</p>

      <div className={`grid gap-2 p-3 ${hasBarcode && photoUrl ? 'grid-cols-3' : 'grid-cols-2'}`}>
        <Button variant="outline" disabled={showPhoto && !photoUrl} onClick={() => setTurned((t) => !t)}><RotateCw size={18} /> Tourner</Button>
        {hasBarcode && photoUrl && (
          <Button variant="outline" onClick={() => { setShowPhoto((p) => !p); setTurned(false); }}>
            {showPhoto ? <><Barcode size={18} /> Code</> : <><Image size={18} /> Photo</>}
          </Button>
        )}
        <Button variant="outline" onClick={() => onEdit(card)}><Pencil size={18} /> Modifier</Button>
      </div>
    </div>
  );
}
