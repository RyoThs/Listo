import { useEffect, useRef } from 'react';

// Le bouton « Retour » d'Android (ou le geste de retour) ferme d'abord la fenêtre ouverte,
// puis revient à l'écran des listes, au lieu de quitter l'application.

type Entry = { cb: () => void; popped: boolean };
const stack: Entry[] = [];
let ignore = 0;

if (typeof window !== 'undefined') {
  window.addEventListener('popstate', () => {
    if (ignore > 0) { ignore--; return; }
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
    history.pushState({ listo: true }, '');
    return () => {
      if (entry.popped) return;
      const i = stack.indexOf(entry);
      if (i >= 0) stack.splice(i, 1);
      ignore++;
      history.back();
    };
  }, [active]);
}
