import { makeBarcode, type BarcodeFormat } from '../../lib/barcode';

/**
 * Dessine le code-barres en noir sur blanc, bien net (une barre = un rectangle).
 * Les marges blanches sur les côtés sont obligatoires : sans elles, la caisse ne lit pas.
 */
export function BarcodeView({ number, format = 'auto', className = '', decorative = false }: {
  number: string; format?: BarcodeFormat; className?: string;
  /** Vignette de l'accueil : simple décoration, ignorée par les lecteurs d'écran. */
  decorative?: boolean;
}) {
  const barcode = makeBarcode(number, format);
  if (!barcode) return null;
  const { bits, quiet } = barcode;
  const width = bits.length + quiet * 2;

  // On regroupe les modules noirs qui se suivent en une seule barre.
  const bars: { x: number; w: number }[] = [];
  for (let i = 0; i < bits.length; i++) {
    if (bits[i] !== '1') continue;
    let w = 1;
    while (bits[i + w] === '1') w++;
    bars.push({ x: quiet + i, w });
    i += w - 1;
  }

  return (
    <svg viewBox={`0 0 ${width} 50`} preserveAspectRatio="none" shapeRendering="crispEdges" 
      {...(decorative ? { 'aria-hidden': true } : { role: 'img', 'aria-label': `Code-barres ${barcode.format === 'ean13' ? 'EAN-13' : 'Code 128'}` })} className={`block w-full bg-white ${className}`}>
      {bars.map((b) => <rect key={b.x} x={b.x} y={0} width={b.w} height={50} fill="#000" />)}
    </svg>
  );
}
