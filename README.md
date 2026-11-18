# 🛒 LISTO

Listes de courses intelligentes, installables sur **Android** et **iPhone**, qui marchent **sans internet**.

## Fonctions
- Plusieurs listes (couleur + icône), créer / renommer / supprimer.
- Rayons devinés automatiquement (« steak haché » → Viande et poisson), et l'appli retient tes corrections. 11 rayons, dont Animalerie.
- Saisie rapide : « 2 kg de pommes, du pain et lait » ajoute 3 articles d'un coup. Suggestions selon tes habitudes.
- Saisie à la voix (micro), boutons + / −, unités (unité, kg, g, L).
- Tri : par rayon, A → Z, ou ton ordre (glisser-déposer avec la poignée ⋮⋮).
- Envoyer la liste par SMS, WhatsApp ou e-mail (bouton ✈️ en haut de la liste) : les articles à prendre, rangés par rayon.
- Lien « Ouvrir dans LISTO » en bas du message : la personne qui le touche ajoute la liste dans son LISTO (copie, sans serveur : les articles voyagent dans le lien). Depuis l'appli installée sur iPhone : « Nouvelle liste » → « Coller une liste reçue ».
- Cartes de fidélité : entre le numéro de ta carte, LISTO dessine le code-barres (EAN-13 ou Code 128, choisi automatiquement). À la caisse, un toucher sur l’accueil l’affiche en grand sur fond blanc, écran allumé, même sans internet. Incluses dans la sauvegarde.
- Mode magasin : grosses lignes, un toucher pour cocher, articles pris grisés ou masqués, total dépensé en direct.
- **Bilan des courses** en quittant le mode Magasin (bouton 🛒 ou Retour) : articles pris, durée, panier, articles pas pris (gardés pour la prochaine fois), bouton « Retirer les articles pris ». Historique sur l'accueil (« Mes courses passées », total du mois).
- **Mémoire des prix** : un prix entré est retenu ; la fois suivante il est pré-rempli et suit la quantité. « Total prévu : environ … · N sans prix ».
- **« Déjà dans la liste »** : ajouter un article déjà présent augmente sa quantité, avec un message qui le dit.
- **Scanner un code-barres** (bouton à côté du micro) : le nom du produit vient d'Open Food Facts (seul le numéro est envoyé, internet nécessaire) ; sans réponse, on écrit le nom et LISTO le reconnaît ensuite même hors ligne. Lecteur intégré du téléphone (Android) ou ZXing (iPhone, chargé seulement au besoin).
- **Recettes et packs** (bouton « Recettes » au-dessus de la barre d'ajout) :
  - *Idées de plats* : 34 plats français intégrés (hors ligne), quantités exactes pour 1 à 12 personnes ; ingrédients des placards (sel, huile, épices) décochés d'office.
  - *En ligne* : recherche dans TheMealDB (≈ 800 recettes, en anglais ; ingrédients courants traduits, quantités converties quand c'est possible). Internet nécessaire.
  - *Mes packs* : « Nouveau pack » (un nom + les articles tapés), ou « Garder dans mes packs » depuis une recette. Un toucher verse le pack dans la liste.
- **Listes favorites** : « Enregistrer en favori » dans les options d'une liste ; sur l'accueil, un toucher sur un favori crée une liste toute prête ; « Ajouter un favori » verse ses articles dans la liste ouverte (sans doublon). Raccourci ⭐ au-dessus de la barre d'ajout quand la liste a moins de 5 articles à prendre (ex. un favori « Lasagnes » = un pack d'ingrédients).
- **Annuler** : après une suppression (article, articles pris, liste, favori), un bandeau « Annuler » reste 6 secondes.
- **Sauvegarde** (⚙️ sur l'accueil) : exporter dans un fichier (`listo-sauvegarde-AAAA-MM-JJ.json`) et importer sur un autre téléphone. L'import fusionne sans rien effacer (la version la plus récente gagne) et vérifie le fichier. Point orange sur ⚙️ après 14 jours sans sauvegarde.
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
  db/          base Dexie (db.ts) ; une partie par sujet : lists.ts, items.ts, suggestions.ts,
               favorites.ts, cards.ts, backup.ts, sharedLists.ts, prices.ts, trips.ts, products.ts, recipes.ts ;
               outils communs (queue.ts) ; actions.ts = point d'entrée
  stores/      réglages d'affichage (Zustand, stockage qui ne plante jamais)
  features/    lists, items, cards, favorites, backup, store-mode (bilan, historique), scan, recipes, received, voice, pwa
  components/  ErrorBoundary (cloison anti-panne) ; ui/ : boutons, fenêtres, champs, couleurs, choix
  lib/         rayons, saisie, tri, budget, formats, partage, erreurs, outils téléphone
  lib/barcode/ code-barres maison : ean13.ts, code128.ts (normes publiques, aucune dépendance)
  lib/scan/    scanner : codes produits, Open Food Facts, lecteurs (intégré / ZXing)
  lib/recipes/ recettes : catalogue français, nombre de personnes, TheMealDB (+ traduction, quantités)
tests/         tests automatiques (Vitest + fausse base IndexedDB)
```

## Règles de robustesse
Voir `CLAUDE.md`. En bref : chaque zone d'écran a sa cloison (`ErrorBoundary`), une action ratée affiche un message,
une tâche de fond qui échoue n'arrête pas l'appli, et chaque sujet de données vit dans son propre fichier.
