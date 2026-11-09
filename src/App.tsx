import { useUI } from './stores/ui';
import { ListsScreen } from './features/lists/ListsScreen';
import { ListScreen } from './features/items/ListScreen';
import { Toast } from './components/ui/Toast';

export default function App() {
  const currentListId = useUI((s) => s.currentListId);
  return (
    <>
      {currentListId ? <ListScreen key={currentListId} listId={currentListId} /> : <ListsScreen />}
      <Toast />
    </>
  );
}
