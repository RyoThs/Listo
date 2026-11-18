import { useEffect, useState } from 'react';
import { readListLink, ListLinkError, LINK_KEY, type SharedList } from '../../lib/listLink';
import { useUI } from '../../stores/ui';

/**
 * Regarde si LISTO a été ouvert par un lien « Ouvrir dans LISTO » (…/Listo/#liste=…).
 * Le lien est effacé de la barre d'adresse tout de suite : recharger la page ne rajoute pas la liste une 2e fois.
 */
export function useIncomingLink() {
  const showToast = useUI((s) => s.showToast);
  const [shared, setShared] = useState<SharedList | null>(null);

  useEffect(() => {
    const check = () => {
      if (!location.hash.includes(`${LINK_KEY}=`)) return;
      const hash = location.hash;
      history.replaceState(history.state, '', location.pathname + location.search);
      try {
        setShared(readListLink(hash));
      } catch (e) {
        showToast(e instanceof ListLinkError ? e.message : 'Ce lien de liste est illisible.');
      }
    };
    check();
    window.addEventListener('hashchange', check); // lien touché alors que LISTO était déjà ouvert
    return () => window.removeEventListener('hashchange', check);
  }, [showToast]);

  return { shared, clear: () => setShared(null) };
}
