import { useUI } from '../../stores/ui';

/** Petit message de confirmation qui disparaît tout seul (« Favori enregistré »). */
export function Toast() {
  const toast = useUI((s) => s.toast);
  if (!toast) return null;
  return (
    <div role="status" className="pointer-events-none fixed inset-x-0 top-[max(1rem,env(safe-area-inset-top))] z-[60] flex justify-center px-4">
      <p className="rounded-full bg-ink px-4 py-2.5 text-sm font-medium text-white shadow-lg">{toast}</p>
    </div>
  );
}
