import { describe, expect, it } from 'vitest';
import { lockAxis, swipeOutcome, SWIPE_LOCK_PX } from '../src/lib/swipe';

describe('glissade : sens du geste', () => {
  it('attend un vrai mouvement avant de décider', () => {
    expect(lockAxis(3, 2)).toBeNull();
    expect(lockAxis(SWIPE_LOCK_PX - 1, 0)).toBeNull();
  });
  it('horizontal si le doigt va surtout de côté', () => {
    expect(lockAxis(20, 5)).toBe('x');
    expect(lockAxis(-20, 5)).toBe('x');
  });
  it('vertical si le doigt fait défiler la page (on ne bouge pas la liste)', () => {
    expect(lockAxis(8, 20)).toBe('y');
    expect(lockAxis(12, -12)).toBe('y'); // en cas de doute : on laisse défiler
  });
});

describe('glissade : supprimer ou revenir', () => {
  const width = 360;
  it('petite glissade → la liste revient', () => {
    expect(swipeOutcome(60, width)).toBe('back');
    expect(swipeOutcome(-60, width)).toBe('back');
  });
  it('glissade franche à gauche ou à droite → supprimer', () => {
    expect(swipeOutcome(-200, width)).toBe('delete');
    expect(swipeOutcome(200, width)).toBe('delete');
  });
  it('le seuil est à 40 % de la largeur', () => {
    expect(swipeOutcome(0.39 * width, width)).toBe('back');
    expect(swipeOutcome(0.41 * width, width)).toBe('delete');
  });
  it('geste rapide (lancer) même court → supprimer', () => {
    expect(swipeOutcome(-90, width, -1.2)).toBe('delete');
    expect(swipeOutcome(90, width, 0.2)).toBe('back');
  });
  it('lancer dans le sens inverse du déplacement → revenir', () => {
    expect(swipeOutcome(-90, width, 1.2)).toBe('back');
  });
  it('largeur inconnue → jamais de suppression par erreur', () => {
    expect(swipeOutcome(500, 0)).toBe('back');
  });
});
