import { useState } from 'react';
import { X, RotateCw, Pencil } from 'lucide-react';
import { useBackHandler } from '../../lib/backButton';
import { makeBarcode } from '../../lib/barcode';
import { IconButton, Button } from '../../components/ui/Button';
import type { LoyaltyCard } from '../../types';
import { useWakeLock } from './useWakeLock';
import { BarcodeView } from './BarcodeView';

type Props = { card: LoyaltyCard | null; onClose: () => void; onEdit: (c: LoyaltyCard) => void };

/** La carte en plein écran, sur fond blanc : LISTO dessine le code-barres à partir du numéro. */
export function CardViewer({ card, onClose, onEdit }: Props) {
  useBackHandler(!!card, onClose);
  useWakeLock(!!card);
  if (!card) return null;
  // key : on repart de zéro (pas tourné) à chaque carte ouverte.
  return <CardScreen key={card.id} card={card} onClose={onClose} onEdit={onEdit} />;
}

function CardScreen({ card, onClose, onEdit }: { card: LoyaltyCard; onClose: () => void; onEdit: (c: LoyaltyCard) => void }) {
  const [turned, setTurned] = useState(false);
  const hasBarcode = !!card.number && !!makeBarcode(card.number, card.format);

  return (
    <div className="pt-safe pb-safe fixed inset-0 z-50 flex flex-col bg-white text-ink" role="dialog" aria-modal="true" aria-label={`Carte ${card.name}`}>
      <div className="flex items-center gap-2 px-3 py-2">
        <span className="size-3 shrink-0 rounded-full" style={{ background: card.color }} />
        <h2 className="min-w-0 flex-1 truncate text-xl font-bold">{card.name}</h2>
        <IconButton label="Fermer" onClick={onClose}><X size={24} /></IconButton>
      </div>

      <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden px-3">
        {hasBarcode ? (
          <div className="w-full transition-transform duration-300"
            style={turned ? { transform: 'rotate(90deg)', width: 'min(calc(100dvh - 260px), 640px)' } : undefined}>
            <BarcodeView number={card.number!} format={card.format} className="h-36" />
            <p className="pt-2 text-center font-mono text-2xl font-bold tracking-wider break-all">{card.number}</p>
          </div>
        ) : (
          <div className="space-y-3 text-center">
            <p className="text-lg font-semibold">Il manque le numéro de cette carte.</p>
            <p className="text-muted">Touche « Modifier » et tape les chiffres écrits sous son code-barres.</p>
          </div>
        )}
      </div>

      {hasBarcode && <p className="px-4 pt-2 text-center text-sm text-muted">Monte la luminosité si la caisse a du mal à lire.</p>}
      <div className="grid grid-cols-2 gap-2 p-3">
        <Button variant="outline" disabled={!hasBarcode} onClick={() => setTurned((t) => !t)}><RotateCw size={18} /> Tourner</Button>
        <Button variant={hasBarcode ? 'outline' : 'primary'} onClick={() => onEdit(card)}><Pencil size={18} /> Modifier</Button>
      </div>
    </div>
  );
}
