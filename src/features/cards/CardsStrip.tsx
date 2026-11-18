import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { CreditCard, Plus } from 'lucide-react';
import { getActiveCards } from '../../db/cards';
import { haptic } from '../../lib/device';
import type { LoyaltyCard } from '../../types';
import { CardEditorSheet } from './CardEditorSheet';
import { CardViewer } from './CardViewer';
import { usePhotoUrl } from './usePhotoUrl';
import { BarcodeView } from './BarcodeView';
import { ErrorBoundary } from '../../components/ErrorBoundary';

/** Accueil : « Mes cartes ». Un toucher sur une carte = elle s'affiche en grand pour la caisse. */
export function CardsStrip() {
  const cards = useLiveQuery(getActiveCards, []);
  const [showing, setShowing] = useState<LoyaltyCard | null>(null);
  const [editing, setEditing] = useState<LoyaltyCard | 'new' | null>(null);

  if (!cards) return null;

  return (
    <section className="mb-4">
      <p className="mb-1.5 flex items-center gap-1.5 text-sm text-muted"><CreditCard size={14} className="text-sage" /> Mes cartes de fidélité</p>

      {cards.length === 0 ? (
        <button onClick={() => setEditing('new')}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-line text-[15px] font-medium text-sage-dark active:bg-card">
          <Plus size={18} /> Ajouter une carte de fidélité
        </button>
      ) : (
        <div className="-mx-4 flex gap-2.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
          {cards.map((c) => (
            <button key={c.id} onClick={() => { haptic(); setShowing(c); }} aria-label={`Afficher la carte ${c.name}`}
              className="relative flex h-20 w-32 shrink-0 flex-col justify-end overflow-hidden rounded-2xl p-2.5 text-left text-white shadow-sm active:scale-[0.98]"
              style={{ background: c.color }}>
              <CardThumb card={c} />
              <span className="relative line-clamp-2 text-[15px] leading-tight font-bold drop-shadow">{c.name}</span>
            </button>
          ))}
          <button onClick={() => setEditing('new')} aria-label="Ajouter une carte de fidélité"
            className="flex h-20 w-20 shrink-0 flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-line text-xs font-medium text-sage-dark active:bg-card">
            <Plus size={20} /> Ajouter
          </button>
        </div>
      )}

      <ErrorBoundary name="Affichage de la carte" onReset={() => setShowing(null)}>
        <CardViewer card={showing} onClose={() => setShowing(null)} onEdit={(c) => { setShowing(null); setEditing(c); }} />
      </ErrorBoundary>
      <CardEditorSheet open={editing !== null} card={editing === 'new' ? undefined : editing ?? undefined} onClose={() => setEditing(null)} />
    </section>
  );
}

/** La photo de la carte, en fond légèrement voilé derrière le nom du magasin. */
function CardThumb({ card }: { card: LoyaltyCard }) {
  const url = usePhotoUrl(card.photo);
  if (!url) {
    // Pas de photo : un petit code-barres pour reconnaître la carte d'un coup d'œil.
    return card.number ? (
      <span className="absolute inset-x-2.5 top-2.5 overflow-hidden rounded-md bg-white px-1 py-1 opacity-90">
        <BarcodeView number={card.number} format={card.format} className="h-5" decorative />
      </span>
    ) : null;
  }
  return (
    <>
      <img src={url} alt="" className="absolute inset-0 size-full object-cover opacity-45" />
      <span className="absolute inset-0 bg-gradient-to-t from-black/45 to-transparent" />
    </>
  );
}
