import type { Modifier } from '@dnd-kit/core';

/** Le glissement ne se fait que de haut en bas (pas de côté). */
export const restrictToParent: Modifier = ({ transform }) => ({ ...transform, x: 0 });
