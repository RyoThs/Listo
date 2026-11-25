import { useRef, useState } from 'react';
import { PrivacyLink } from './PrivacySheet';
import { CounterSheet } from './CounterSheet';
import { loadSession, tapCounter } from '../../lib/counterAdmin';

// Bas de l'accueil : numéro de version, « Confidentialité », et l'entrée cachée du compteur (réservée à Yoann) :
// 5 touchers rapides sur le numéro de version. Une fois connecté, un petit lien « Compteur » reste visible sur CE téléphone.

export function AboutFooter() {
  const [counterOpen, setCounterOpen] = useState(false);
  const [connected, setConnected] = useState(() => loadSession(localStorage) !== null);
  const tap = useRef(tapCounter(5, 3000));
  return (
    <div className="flex flex-col items-center pt-6">
      <p className="select-none px-4 py-1 text-center text-xs text-muted" onClick={() => { if (tap.current(Date.now())) setCounterOpen(true); }}>
        LISTO v{__APP_VERSION__}
      </p>
      <div className="flex items-center">
        <PrivacyLink />
        {connected && (
          <button onClick={() => setCounterOpen(true)} className="min-h-11 px-3 text-xs text-muted underline underline-offset-2">Compteur</button>
        )}
      </div>
      <CounterSheet open={counterOpen} onClose={() => setCounterOpen(false)} onSessionChange={setConnected} />
    </div>
  );
}
