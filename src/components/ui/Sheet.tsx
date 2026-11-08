import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { useBackHandler } from '../../lib/backButton';
import { IconButton } from './Button';

/** Fenêtre qui monte du bas de l'écran. Se ferme avec le bouton Retour d'Android. */
export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  useBackHandler(open, onClose);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-ink/35" onClick={onClose} />
      <div className="animate-slide-up pb-safe relative max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-card px-4 pt-2 shadow-2xl">
        <div className="mx-auto mb-1 h-1.5 w-10 rounded-full bg-line" />
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">{title}</h2>
          <IconButton label="Fermer" onClick={onClose}><X size={22} /></IconButton>
        </div>
        {children}
      </div>
    </div>
  );
}
