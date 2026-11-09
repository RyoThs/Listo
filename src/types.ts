// Les « formes » des données de LISTO (le cahier des charges + les ajouts validés).

export type Unit = 'unité' | 'kg' | 'g' | 'L';
export type SortMode = 'category' | 'alpha' | 'custom';

export interface ShoppingItem {
  id: string;
  listId: string;
  name: string;
  category: string;
  quantity: number;
  unit?: Unit;
  estimatedPrice?: number; // prix de la ligne, en euros
  isCompleted: boolean;
  createdAt: number;
  // Ajouts : ordre personnel, date de modification, effacement doux (pour le futur partage)
  order: number;
  updatedAt: number;
  deletedAt?: number;
}

export interface ShoppingList {
  id: string;
  title: string;
  color: string;
  icon?: string;
  createdAt: number;
  updatedAt: number;
  sortMode: SortMode;
  deletedAt?: number;
}

/** Un article mémorisé dans une liste favorite (sans état coché). */
export interface FavoriteItem {
  name: string;
  category: string;
  quantity: number;
  unit?: Unit;
  estimatedPrice?: number;
}

/** Liste favorite : un modèle réutilisable (ex. « Courses de la semaine »). */
export interface Favorite {
  id: string;
  title: string;
  color: string;
  icon?: string;
  items: FavoriteItem[];
  sourceListId?: string; // la liste d'où il vient (pour le mettre à jour au lieu d'en créer un 2e)
  createdAt: number;
  updatedAt: number;
  deletedAt?: number;
}

/** Mémoire des articles déjà tapés, pour les suggestions. */
export interface Suggestion {
  key: string; // nom en minuscules, sans accents
  name: string;
  category: string;
  unit?: Unit;
  count: number;
  lastUsed: number;
}

/** Un changement en attente d'envoi (quand le partage en ligne existera). */
export interface SyncOp {
  id?: number;
  table: 'lists' | 'items' | 'favorites';
  recordId: string;
  action: 'put' | 'delete';
  at: number;
}
