import { useUI } from './stores/ui';
import { ListsScreen } from './features/lists/ListsScreen';
import { ListScreen } from './features/items/ListScreen';
import { Toast } from './components/ui/Toast';
import { UndoBar } from './components/ui/UndoBar';
import { ErrorBoundary } from './components/ErrorBoundary';
import { IncomingList } from './features/received/IncomingList';

export default function App() {
  const currentListId = useUI((s) => s.currentListId);
  const openList = useUI((s) => s.openList);
  return (
    <>
      {/* Chaque écran a sa cloison : s'il plante, « Réessayer » ramène à l'accueil. */}
      <ErrorBoundary key={currentListId ?? 'accueil'} name="Écran" variant="screen" onReset={() => openList(null)}>
        {currentListId ? <ListScreen key={currentListId} listId={currentListId} /> : <ListsScreen />}
      </ErrorBoundary>
      <ErrorBoundary name="Liste reçue"><IncomingList /></ErrorBoundary>
      <ErrorBoundary name="Messages"><Toast /></ErrorBoundary>
      <ErrorBoundary name="Annuler"><UndoBar /></ErrorBoundary>
    </>
  );
}
