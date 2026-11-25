import html from '../index.html?raw';
import { describe, expect, it, vi } from 'vitest';
import { blockZoom } from '../src/lib/noZoom';

// Demande de Yoann (2026-11-25) : bloquer le zoom (pincer à deux doigts, double toucher).

describe('zoom bloqué', () => {
  it('la page interdit le zoom (Android) et le double toucher', () => {
    expect(html).toMatch(/name="viewport"[^>]*maximum-scale=1/);
    expect(html).toMatch(/name="viewport"[^>]*user-scalable=no/);
    // (le CSS « touch-action: manipulation » se vérifie dans le vrai navigateur : e2e-zoom-save)
  });

  it('iPhone : le geste « pincer » est annulé (Safari ignore user-scalable=no)', () => {
    const handlers: Record<string, (e: unknown) => void> = {};
    const doc = { addEventListener: vi.fn((type: string, h: (e: unknown) => void) => { handlers[type] = h; }) };
    blockZoom(doc as unknown as Document);
    const pinch = { preventDefault: vi.fn(), touches: { length: 2 } };
    handlers.gesturestart(pinch);
    expect(pinch.preventDefault).toHaveBeenCalled();
    const twoFingers = { preventDefault: vi.fn(), touches: { length: 2 } };
    handlers.touchmove(twoFingers);
    expect(twoFingers.preventDefault).toHaveBeenCalled();
    const oneFinger = { preventDefault: vi.fn(), touches: { length: 1 } }; // faire défiler, glisser une liste : intact
    handlers.touchmove(oneFinger);
    expect(oneFinger.preventDefault).not.toHaveBeenCalled();
    expect(doc.addEventListener).toHaveBeenCalledWith('touchmove', expect.any(Function), { passive: false });
  });
});
