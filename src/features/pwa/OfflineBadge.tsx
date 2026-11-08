import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';

/** Petit badge « Hors ligne » : rassure, tout continue de marcher. */
export function OfflineBadge() {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true), off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);
  if (online) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-line px-2.5 py-1 text-xs font-medium text-muted" title="Tout est enregistré dans le téléphone">
      <WifiOff size={13} /> Hors ligne
    </span>
  );
}
