# Consignes pour Claude (dépôt LISTO)

LISTO est l'appli de listes de courses de Yoann (débutant). Fiche projet et décisions : coffre `MonCerveau`, `02 - Projets/LISTO/`.
Réponds en français simple. Code complet d'abord, puis explications sans jargon.

## Règles de construction (robustesse) — à respecter à chaque modification
1. **Une erreur ne casse jamais tout.**
   - Chaque écran est dans un `ErrorBoundary variant="screen"` (voir `src/App.tsx`).
   - Chaque zone indépendante d'un écran (cartes, favoris, budget, articles, barre d'ajout…) a son `ErrorBoundary name="…"`.
   - Toutes les fenêtres `Sheet` sont protégées automatiquement.
2. **Le contenu d'une fenêtre est un composant à part**, rendu à l'intérieur de `<Sheet>` (ex. `FavoritePickerSheet` → `FavoritePicker`).
   Sinon il est calculé même fermé, hors de la cloison, et peut faire tomber l'écran entier (bug trouvé le 2026-11-18).
3. **Aucune erreur silencieuse.** Les actions lancées avec `void …` qui échouent affichent « Oups, ça n'a pas marché » (`src/lib/errors.ts`).
   Les tâches de fond se lancent avec `startSafely(...)`.
4. **Un sujet = un fichier.** Données : `src/db/lists.ts`, `items.ts`, `suggestions.ts`, `favorites.ts`, `cards.ts`, `backup.ts`, outils communs `queue.ts`.
   `actions.ts` ne fait que tout regrouper. Écrans : un dossier par fonctionnalité dans `src/features/`.
5. **Pas de copier-coller d'interface** : réutiliser `components/ui/` (Button, Sheet, Field, Segmented, ColorPicker…).
6. **Plusieurs écritures liées = une seule transaction** (tout ou rien).
7. **Ne jamais faire confiance à un fichier importé** : tout passe par les fonctions `clean…` de `backup.ts`.
8. **Le stockage peut refuser** (iPhone en navigation privée, mémoire pleine) : toujours `try/catch`.

## Avant chaque envoi
- `npm test` (Vitest) et `npm run build` doivent passer.
- Nouvelle fonctionnalité = nouveaux tests dans `tests/`.
- Vérifier sur téléphones simulés (Playwright : iPhone et Pixel), y compris en **cassant volontairement** une donnée pour voir que seule la zone concernée affiche « … n'a pas pu s'afficher ».
- Monter la version dans `package.json` (elle s'affiche en bas de l'accueil).
- Mettre à jour la fiche LISTO, le journal du jour et, pour un choix important, une note dans `04 - Décisions/` du coffre.
