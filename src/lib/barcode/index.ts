import { encodeEan13, isValidEan13 } from './ean13';
import { canEncodeCode128, encodeCode128 } from './code128';

// Transforme le numéro d'une carte de fidélité en code-barres à afficher à la caisse.

export type BarcodeFormat = 'auto' | 'ean13' | 'code128';

export const FORMAT_LABELS: Record<BarcodeFormat, string> = { auto: 'Automatique', ean13: 'EAN-13', code128: 'Code 128' };

export interface Barcode {
  format: 'ean13' | 'code128';
  /** '1' = module noir, '0' = module blanc (sans marges). */
  bits: string;
  /** Marge blanche à garder de chaque côté, en modules (la caisse en a besoin). */
  quiet: number;
}

/** Les espaces imprimés sur la carte ne font pas partie du code. */
export const codeFromNumber = (number: string) => number.replace(/\s+/g, '');

/**
 * Fabrique le code-barres. « Automatique » : EAN-13 si le numéro en est un (13 chiffres, contrôle juste),
 * sinon Code 128 (accepte presque tout). Renvoie null si c'est impossible.
 */
export function makeBarcode(number: string, format: BarcodeFormat = 'auto'): Barcode | null {
  const code = codeFromNumber(number);
  if (!code) return null;
  if (format !== 'code128' && isValidEan13(code)) return { format: 'ean13', bits: encodeEan13(code), quiet: 11 };
  if (format !== 'ean13' && canEncodeCode128(code)) return { format: 'code128', bits: encodeCode128(code), quiet: 10 };
  return null;
}

/** Explication simple quand le code ne peut pas être fabriqué (sinon undefined). */
export function barcodeProblem(number: string, format: BarcodeFormat = 'auto'): string | undefined {
  const code = codeFromNumber(number);
  if (!code || makeBarcode(number, format)) return undefined;
  if (format === 'ean13') return /^\d{13}$/.test(code)
    ? 'Ce n’est pas un EAN-13 valide : vérifie les chiffres (le dernier sert de contrôle).'
    : `Un EAN-13 a 13 chiffres (tu en as ${code.replace(/\D/g, '').length}).`;
  return 'Seuls les chiffres, les lettres sans accent et la ponctuation simple sont possibles.';
}
