import { useIncomingLink } from './useIncomingLink';
import { ReceivedListSheet } from './ReceivedListSheet';

/** Branché une fois dans App : propose d'ajouter la liste quand LISTO s'ouvre par un lien reçu. */
export function IncomingList() {
  const { shared, clear } = useIncomingLink();
  return <ReceivedListSheet shared={shared} onClose={clear} />;
}
