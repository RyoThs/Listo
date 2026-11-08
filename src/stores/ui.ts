import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Les réglages d'affichage (pas les données : elles sont dans la base).
interface UIState {
  currentListId: string | null;
  storeMode: boolean;
  completedDisplay: 'dim' | 'hide';
  openList: (id: string | null) => void;
  setStoreMode: (on: boolean) => void;
  setCompletedDisplay: (v: 'dim' | 'hide') => void;
}

export const useUI = create<UIState>()(
  persist(
    (set) => ({
      currentListId: null,
      storeMode: false,
      completedDisplay: 'dim',
      openList: (id) => set({ currentListId: id, storeMode: false }),
      setStoreMode: (on) => set({ storeMode: on }),
      setCompletedDisplay: (v) => set({ completedDisplay: v }),
    }),
    { name: 'listo-ui', partialize: (s) => ({ completedDisplay: s.completedDisplay }) },
  ),
);
