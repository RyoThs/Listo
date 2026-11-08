# 🛒 LISTO

Listes de courses intelligentes, installables sur **Android** et **iPhone**, qui marchent **sans internet**.

## Fonctions
- Plusieurs listes (couleur + icône), créer / renommer / supprimer.
- Rayons devinés automatiquement (« steak haché » → Viande et poisson), et l'appli retient tes corrections.
- Saisie rapide : « 2 kg de pommes, du pain et lait » ajoute 3 articles d'un coup. Suggestions selon tes habitudes.
- Saisie à la voix (micro), boutons + / −, unités (unité, kg, g, L).
- Tri : par rayon, A → Z, ou ton ordre (glisser-déposer avec la poignée ⋮⋮).
- Mode magasin : grosses lignes, un toucher pour cocher, articles pris grisés ou masqués, total dépensé en direct.
- Hors ligne complet (service worker + base IndexedDB). Changements notés dans une file d'attente pour le futur partage en famille.

### Spécial Android
- Vrai bouton **« Installer »** (Chrome, Samsung Internet, Edge).
- Icône « maskable » : s'adapte à la forme d'icône du téléphone (rond, carré, goutte).
- Le **bouton Retour** ferme la fenêtre ouverte puis revient aux listes, sans quitter l'appli.
- Petite **vibration** quand on coche.
- Stockage **protégé** : on demande à Chrome de ne jamais effacer les listes, même quand le téléphone manque de place.

## Commandes
```bash
npm install        # installer (une seule fois)
npm run dev        # lancer en local ; sur le téléphone : http://<ip-du-PC>:5173
npm test           # tests automatiques
npm run build      # version finale dans dist/
npm run preview    # tester la version finale
npm run icons      # refaire les icônes depuis public/icon.svg
```

## En ligne
👉 **https://ryoths.github.io/Listo/** (GitHub Pages, HTTPS)

Publication automatique : chaque envoi sur `main` lance `.github/workflows/deploy.yml` (tests → construction → mise en ligne). Si un test échoue, rien n'est publié.

> L'installation sur le téléphone et le hors ligne demandent **HTTPS**. En local via le Wi-Fi, l'appli marche mais ne s'installe pas.

## Organisation
```
src/
  db/          base Dexie (db.ts), actions (actions.ts), synchro future (sync.ts)
  stores/      réglages d'affichage (Zustand)
  features/    lists, items, store-mode, voice, pwa
  components/ui/  boutons, fenêtres, champs (style shadcn/ui)
  lib/         rayons, compréhension de la saisie, tri, budget, formats, outils téléphone
tests/         tests automatiques (Vitest + fausse base IndexedDB)
```
