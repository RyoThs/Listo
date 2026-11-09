import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Les réglages d'affichage (pas les données : elles sont dans la base).
interface UIState {
  currentListId: string | null;
  storeMode: boolean;
  completedDisplay: 'dim' | 'hide';
  toast: string | null;
  showToast: (message: string) => void;
  undo: { id: number; message: string; run: () => Promise<void> | void } | null;
  offerUndo: (message: string, run: () => Promise<void> | void) => void;
  clearUndo: () => void;
  lastBackupAt: number | null;
  markBackup: () => void;
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
      toast: null,
      showToast: (message) => {
        set({ toast: message });
        setTimeout(() => set((s) => (s.toast === message ? { toast: null } : s)), 2200);
      },
      undo: null,
      offerUndo: (message, run) => {
        const id = Date.now() + Math.random();
        set({ undo: { id, message, run } });
        setTimeout(() => set((s) => (s.undo?.id === id ? { undo: null } : s)), 6000); // 6 secondes pour changer d'avis
      },
      clearUndo: () => set({ undo: null }),
      lastBackupAt: null,
      markBackup: () => set({ lastBackupAt: Date.now() }),
      openList: (id) => set({ currentListId: id, storeMode: false }),
      setStoreMode: (on) => set({ storeMode: on }),
      setCompletedDisplay: (v) => set({ completedDisplay: v }),
    }),
    { name: 'listo-ui', partialize: (s) => ({ completedDisplay: s.completedDisplay, lastBackupAt: s.lastBackupAt }) },
  ),
);
