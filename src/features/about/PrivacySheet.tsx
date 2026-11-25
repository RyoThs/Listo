import { useState } from 'react';
import { Sheet } from '../../components/ui/Sheet';

// Page « Confidentialité » (bas de l'accueil). Le texte est un composant à part, rendu dans la fenêtre (règle n° 2).

function PrivacyText() {
  return (
    <div className="space-y-3 pb-4 text-[15px] leading-relaxed">
      <p><strong>Tes listes restent sur ton téléphone.</strong> LISTO n’a pas de compte et n’envoie jamais tes listes, tes articles, tes prix ni tes cartes sur Internet.</p>
      <p>Elles partent seulement si tu le décides : sauvegarde (un fichier que tu gardes), partage d’une liste par message.</p>
      <p>Pour un produit scanné, LISTO demande son nom à Open Food Facts (seulement le code-barres). Pour une recette du monde, il interroge TheMealDB.</p>
      <h3 className="pt-2 font-bold">Compteur anonyme</h3>
      <p>Pour savoir combien de personnes utilisent LISTO, l’appli ajoute « +1 » à un compteur de la semaine, la première fois de la semaine où tu te sers de ta liste. Elle n’envoie que le type de téléphone (« iPhone », « Android » ou « autre »), si c’est la toute première fois, et si LISTO est installé sur l’écran d’accueil.</p>
      <p>Aucun numéro, aucun nom, rien sur tes listes : impossible de savoir qui tu es. Sur le téléphone, LISTO garde seulement la date de la semaine déjà comptée.</p>
    </div>
  );
}

export function PrivacyLink() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} className="min-h-11 px-3 text-xs text-muted underline underline-offset-2">
        Confidentialité
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Confidentialité">
        <PrivacyText />
      </Sheet>
    </>
  );
}
