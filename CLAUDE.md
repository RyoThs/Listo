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
   Toute fenêtre plein écran (`Sheet`, `CardViewer`) est posée sur `<body>` avec `createPortal` : placée dans un parent flouté (`backdrop-blur`) ou décalé, elle ne couvrait que ce parent et laissait toucher la liste derrière (bug Recettes trouvé le 2026-11-21, test `e2e-sheet-cover`).
3. **Aucune erreur silencieuse.** Les actions lancées avec `void …` qui échouent affichent « Oups, ça n'a pas marché » (`src/lib/errors.ts`).
   Les tâches de fond se lancent avec `startSafely(...)`.
4. **Un sujet = un fichier.** Code-barres des cartes : `src/lib/barcode/` (un fichier par format, vérifiés par la « caisse virtuelle » ZXing dans `tests/barcode.test.ts`).
   Données : `src/db/lists.ts`, `items.ts`, `suggestions.ts`, `favorites.ts`, `cards.ts`, `backup.ts`, `sharedLists.ts`, `prices.ts` (mémoire des prix), `trips.ts` (historique des courses), `products.ts` (produits scannés), outils communs `queue.ts`.
   Scanner : `src/lib/scan/` (codes produits, Open Food Facts, lecteurs) + `src/features/scan/`. ZXing est livré dans l'appli pour le scanner (iPhone), importé pièce par pièce dans `zxingDecoder.ts` pour rester léger (~15 Ko compressé).
   Bilan et historique : `src/lib/tripSummary.ts` + `src/features/store-mode/`.
   Recettes : `src/lib/recipes/` (catalog.ts, scale.ts, measure.ts, ingredientsFr.ts, mealdb.ts) + `src/db/recipes.ts` (packs, ajout tout ou rien) + `src/features/recipes/` (un onglet = une cloison).
   Lien « Ouvrir dans LISTO » : `src/lib/listLink.ts` (fabrication + vérification du lien), écrans dans `src/features/received/`.
   `actions.ts` ne fait que tout regrouper. Écrans : un dossier par fonctionnalité dans `src/features/`.
5. **Pas de copier-coller d'interface** : réutiliser `components/ui/` (Button, Sheet, Field, Segmented, ColorPicker…).
6. **Plusieurs écritures liées = une seule transaction** (tout ou rien).
7. **Ne jamais faire confiance à un fichier importé** : tout passe par les fonctions `clean…` de `backup.ts`.
8. **Ne jamais faire confiance à ce qui vient d'internet** (Open Food Facts, TheMealDB) : nom nettoyé et raccourci, délai maximum, pas de réseau = on demande le nom.
9. **Le stockage peut refuser** (iPhone en navigation privée, mémoire pleine) : toujours `try/catch`.

## TDD : le test d'abord (demandé le 2026-11-18)
1. Écrire le test de la prochaine petite étape dans `tests/`, lancer `npx vitest run <fichier>` et le voir **échouer** (rouge).
2. Écrire le code le plus simple qui le fait passer (vert).
3. Nettoyer le code, tests toujours verts. Puis l'étape suivante.
- Un bug = d'abord un test qui le reproduit, puis la correction.
- Pour les écrans : la logique va dans `src/lib/` ou `src/db/` (testable d'abord) ; l'écran se vérifie ensuite avec Playwright.

## Avant chaque envoi
- `npm test` (Vitest) et `npm run build` doivent passer.
- Nouvelle fonctionnalité = nouveaux tests dans `tests/`.
- ⚠️ La fausse base des tests (fake-indexeddb) n'annule PAS une transaction ratée : le « tout ou rien » se vérifie dans le vrai navigateur (Playwright).
- Vérifier sur téléphones simulés (Playwright : iPhone et Pixel), y compris en **cassant volontairement** une donnée pour voir que seule la zone concernée affiche « … n'a pas pu s'afficher ».
- Monter la version dans `package.json` (elle s'affiche en bas de l'accueil).
- Mettre à jour la fiche LISTO, le journal du jour et, pour un choix important, une note dans `04 - Décisions/` du coffre.
