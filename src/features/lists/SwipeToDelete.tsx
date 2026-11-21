import { useRef, useState, type ReactNode, type PointerEvent } from 'react';
import { Trash2 } from 'lucide-react';
import { lockAxis, swipeOutcome, SWIPE_DELETE_RATIO } from '../../lib/swipe';
import { haptic } from '../../lib/device';

type Gesture = { id: number; x: number; y: number; t: number; axis: 'x' | 'y' | null; lastX: number; lastT: number; v: number };

/**
 * Glisser à gauche ou à droite pour supprimer (comme dans Mail ou Gmail).
 * Petite glissade → revient. Glissade franche ou « lancer » → onDelete (qui propose « Annuler »).
 * Défilement vertical : le navigateur garde la main (touch-action: pan-y), rien ne bouge.
 */
export function SwipeToDelete({ label, onDelete, children }: { label: string; onDelete: () => Promise<boolean>; children: ReactNode }) {
  const [dx, setDx] = useState(0);
  const [phase, setPhase] = useState<'idle' | 'drag' | 'settle' | 'out'>('idle');
  const g = useRef<Gesture | null>(null);
  const swiped = useRef(false); // pour ne pas ouvrir la liste au moment où on lâche
  const box = useRef<HTMLDivElement>(null);
  const width = () => box.current?.offsetWidth ?? 0;
  const past = Math.abs(dx) >= width() * SWIPE_DELETE_RATIO;

  const reset = () => { g.current = null; setPhase('settle'); setDx(0); };

  const onPointerDown = (e: PointerEvent) => {
    if (phase === 'out' || (e.pointerType === 'mouse' && e.button !== 0)) return;
    swiped.current = false;
    g.current = { id: e.pointerId, x: e.clientX, y: e.clientY, t: e.timeStamp, axis: null, lastX: e.clientX, lastT: e.timeStamp, v: 0 };
  };

  const onPointerMove = (e: PointerEvent) => {
    const s = g.current;
    if (!s || s.id !== e.pointerId) return;
    const mx = e.clientX - s.x, my = e.clientY - s.y;
    if (!s.axis) {
      s.axis = lockAxis(mx, my);
      if (s.axis === 'x') { swiped.current = true; setPhase('drag'); (e.currentTarget as Element).setPointerCapture?.(e.pointerId); }
    }
    if (s.axis !== 'x') return;
    const dt = e.timeStamp - s.lastT;
    if (dt > 0) s.v = (e.clientX - s.lastX) / dt;
    s.lastX = e.clientX; s.lastT = e.timeStamp;
    const w = width();
    if ((Math.abs(dx) < w * SWIPE_DELETE_RATIO) !== (Math.abs(mx) < w * SWIPE_DELETE_RATIO)) haptic(8); // on franchit le seuil
    setDx(mx);
  };

  const onPointerUp = (e: PointerEvent) => {
    const s = g.current;
    if (!s || s.id !== e.pointerId) return;
    if (s.axis !== 'x') { g.current = null; return; }
    const w = width();
    if (swipeOutcome(dx, w, s.v) === 'back') return reset();
    g.current = null;
    setPhase('out');
    setDx(Math.sign(dx || s.v) * (w + 40));
    window.setTimeout(() => {
      void onDelete().then((done) => { if (!done) { setPhase('settle'); setDx(0); } });
    }, 180);
  };

  const side = dx < 0 ? 'justify-end pr-5' : 'justify-start pl-5';
  return (
    <div ref={box} className="relative overflow-hidden rounded-2xl">
      {dx !== 0 && (
        <div aria-hidden className={`absolute inset-0 flex items-center ${side} rounded-2xl font-semibold text-white transition-colors ${past || phase === 'out' ? 'bg-danger' : 'bg-danger/60'}`}>
          <span className={`flex items-center gap-2 transition-transform ${past ? 'scale-110' : ''}`}><Trash2 size={20} /> Supprimer</span>
        </div>
      )}
      <div
        aria-label={label}
        className={`relative touch-pan-y select-none ${phase === 'drag' ? '' : 'transition-transform duration-200 ease-out'}`}
        style={{ transform: dx ? `translateX(${dx}px)` : undefined }}
        onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}
        onPointerCancel={() => { if (phase !== 'out') reset(); }}
        onClickCapture={(e) => { if (swiped.current) { e.preventDefault(); e.stopPropagation(); swiped.current = false; } }}
        onTransitionEnd={() => { if (phase === 'settle') setPhase('idle'); }}
      >
        {children}
      </div>
    </div>
  );
}
