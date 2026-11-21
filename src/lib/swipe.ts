// La logique du geste « glisser pour supprimer » (sans écran : facile à tester).

/** Déplacement (en pixels) avant de décider si le doigt glisse de côté ou fait défiler la page. */
export const SWIPE_LOCK_PX = 10;
/** Part de la largeur à dépasser pour supprimer. */
export const SWIPE_DELETE_RATIO = 0.4;
/** Vitesse (pixels par milliseconde) d'un « lancer » qui supprime même si le geste est court. */
export const SWIPE_FLING_SPEED = 0.8;

/** 'x' = glissade de côté, 'y' = défilement de la page, null = pas encore assez bougé. En cas de doute : défilement. */
export function lockAxis(dx: number, dy: number): 'x' | 'y' | null {
  if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_LOCK_PX) return null;
  return Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
}

/** Au moment de lâcher : supprimer, ou revenir à sa place. */
export function swipeOutcome(dx: number, width: number, velocity = 0): 'delete' | 'back' {
  if (!(width > 0)) return 'back';
  if (Math.abs(dx) >= width * SWIPE_DELETE_RATIO) return 'delete';
  const flung = Math.abs(velocity) >= SWIPE_FLING_SPEED && Math.sign(velocity) === Math.sign(dx) && Math.abs(dx) >= width * 0.15;
  return flung ? 'delete' : 'back';
}
