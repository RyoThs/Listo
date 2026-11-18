import { useEffect, useState } from 'react';
import { X, RotateCw, Pencil } from 'lucide-react';
import { useBackHandler } from '../../lib/backButton';
import { IconButton, Button } from '../../components/ui/Button';
import type { LoyaltyCard } from '../../types';
import { usePhotoUrl } from './CardsStrip';

/**
 * La carte en plein écran, sur fond blanc, pour la montrer à la caisse.
 * L'écran reste allumé tant qu'elle est affichée (quand le téléphone le permet).
 */
export function CardViewer({ card, onClose, onEdit }: { card: LoyaltyCard | null; onClose: () => void; onEdit: (c: LoyaltyCard) => void }) {
  const open = !!card;
  useBackHandler(open, onClose);
  const url = usePhotoUrl(card);
  const [turned, setTurned] = useState(false);

  useEffect(() => { setTurned(false); }, [card?.id]);

  // Garder l'écran allumé pendant le passage en caisse.
  useEffect(() => {
    if (!open || !('wakeLock' in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let cancelled = false;
    const ask = () => navigator.wakeLock.request('screen').then((l) => { if (cancelled) void l.release(); else lock = l; }).catch(() => {});
    void ask();
    const again = () => { if (document.visibilityState === 'visible') void ask(); };
    document.addEventListener('visibilitychange', again);
    return () => { cancelled = true; document.removeEventListener('visibilitychange', again); void lock?.release(); };
  }, [open]);

  if (!card) return null;

  return (
    <div className="pt-safe pb-safe fixed inset-0 z-50 flex flex-col bg-white text-ink" role="dialog" aria-modal="true" aria-label={`Carte ${card.name}`}>
      <div className="flex items-center gap-2 px-3 py-2">
        <span className="size-3 shrink-0 rounded-full" style={{ background: card.color }} />
        <h2 className="min-w-0 flex-1 truncate text-xl font-bold">{card.name}</h2>
        <IconButton label="Fermer" onClick={onClose}><X size={24} /></IconButton>
      </div>

      <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden px-3">
        {url ? (
          <img src={url} alt={`Photo de la carte ${card.name}`}
            className="max-h-full max-w-full rounded-xl object-contain transition-transform duration-300"
            style={turned ? { transform: 'rotate(90deg)', maxWidth: 'calc(100dvh - 220px)', maxHeight: 'calc(100vw - 24px)' } : undefined} />
        ) : (
          <p className="text-center text-muted">Pas de photo pour cette carte.</p>
        )}
      </div>

      {card.number && (
        <p className="px-4 pt-3 text-center font-mono text-2xl font-bold tracking-wider break-all select-all">{card.number}</p>
      )}
      <p className="px-4 pt-1 text-center text-sm text-muted">Monte la luminosité si la caisse a du mal à lire.</p>

      <div className="grid grid-cols-2 gap-2 p-3">
        <Button variant="outline" disabled={!url} onClick={() => setTurned((t) => !t)}><RotateCw size={18} /> Tourner</Button>
        <Button variant="outline" onClick={() => onEdit(card)}><Pencil size={18} /> Modifier</Button>
      </div>
    </div>
  );
}
