// Import pièce par pièce : seul le lecteur de codes « produits » est embarqué (pas les QR codes, etc.).
import BarcodeFormat from '@zxing/library/esm/core/BarcodeFormat';
import BinaryBitmap from '@zxing/library/esm/core/BinaryBitmap';
import ChecksumException from '@zxing/library/esm/core/ChecksumException';
import DecodeHintType from '@zxing/library/esm/core/DecodeHintType';
import FormatException from '@zxing/library/esm/core/FormatException';
import HybridBinarizer from '@zxing/library/esm/core/common/HybridBinarizer';
import MultiFormatUPCEANReader from '@zxing/library/esm/core/oned/MultiFormatUPCEANReader';
import NotFoundException from '@zxing/library/esm/core/NotFoundException';
import RGBLuminanceSource from '@zxing/library/esm/core/RGBLuminanceSource';

// Lecteur de codes-barres « de secours » pour les téléphones qui n'en ont pas d'intégré (iPhone).
// ZXing est le lecteur de référence (projet libre, licence Apache-2.0).
// Ce fichier n'est téléchargé que la première fois qu'on scanne sur un tel téléphone.

const hints = new Map<DecodeHintType, unknown>([
  [DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A]],
  [DecodeHintType.TRY_HARDER, true],
]);
const reader = new MultiFormatUPCEANReader(hints);

/** Image couleur (RGBA) → niveaux de gris, ce que lit ZXing. */
export function toLuminance(rgba: Uint8ClampedArray): Uint8ClampedArray {
  const out = new Uint8ClampedArray(rgba.length / 4);
  for (let i = 0, j = 0; j < out.length; i += 4, j++) out[j] = (rgba[i] + 2 * rgba[i + 1] + rgba[i + 2]) >> 2;
  return out;
}

/** Cherche un code-barres dans l'image. null = rien trouvé sur cette image (normal : on réessaie à la suivante). */
export function decodeImage(rgba: Uint8ClampedArray, width: number, height: number): string | null {
  try {
    const bitmap = new BinaryBitmap(new HybridBinarizer(new RGBLuminanceSource(toLuminance(rgba), width, height)));
    return reader.decode(bitmap, hints).getText();
  } catch (e) {
    if (e instanceof NotFoundException || e instanceof ChecksumException || e instanceof FormatException) return null;
    throw e; // un vrai problème : on ne le cache pas
  }
}
