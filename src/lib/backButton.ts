import { useEffect, useRef } from 'react';

// Le bouton « Retour » d'Android (ou le geste de retour) ferme d'abord la fenêtre ouverte,
// puis revient à l'écran des listes, au lieu de quitter l'application.

type Entry = { cb: () => void; popped: boolean };
const stack: Entry[] = [];
let ignore = 0;      // nombre de « retours » lancés par nous, à ne pas traiter
let pendingPush = 0; // fenêtres ouvertes pendant qu'un retour était en cours

function pushEntry() {
  // Si un retour est encore en route, on attend qu'il soit fini avant d'ajouter
  // la nouvelle étape, sinon il l'effacerait par erreur.
  if (ignore > 0) pendingPush++;
  else history.pushState({ listo: true }, '');
}

if (typeof window !== 'undefined') {
  window.addEventListener('popstate', () => {
    if (ignore > 0) {
      ignore--;
      if (ignore === 0) for (; pendingPush > 0; pendingPush--) history.pushState({ listo: true }, '');
      return;
    }
    const top = stack.pop();
    if (top) { top.popped = true; top.cb(); }
  });
}

export function useBackHandler(active: boolean, onBack: () => void) {
  const cbRef = useRef(onBack);
  cbRef.current = onBack;
  useEffect(() => {
    if (!active) return;
    const entry: Entry = { cb: () => cbRef.current(), popped: false };
    stack.push(entry);
    pushEntry();
    return () => {
      if (entry.popped) return;
      const i = stack.indexOf(entry);
      if (i >= 0) stack.splice(i, 1);
      ignore++;
      history.back();
    };
  }, [active]);
}
