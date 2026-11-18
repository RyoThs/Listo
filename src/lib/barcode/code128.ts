// Code 128 : code-barres qui accepte tous les chiffres et lettres simples (A-Z, a-z, 0-9, ponctuation).
// Norme publique (ISO/IEC 15417). Chaque symbole = 3 barres + 3 espaces, de largeur 1 à 4 modules.

// Largeurs (barre, espace, barre, espace, barre, espace) des symboles 0 à 105.
const PATTERNS = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213',
  '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132',
  '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211',
  '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313',
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331',
  '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111',
  '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214',
  '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111',
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141',
  '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141',
  '114131', '311141', '411131', '211412', '211214', '211232',
];
const STOP = '2331112';
const START_B = 104, START_C = 105, CODE_C = 99;

/** Vrai si le texte peut s'écrire en Code 128 (caractères simples, 1 à 48 caractères). */
export function canEncodeCode128(text: string): boolean {
  return text.length > 0 && text.length <= 48 && /^[\x20-\x7E]+$/.test(text);
}

/** Choisit les symboles : les chiffres vont par paires (jeu C, plus court), le reste en jeu B. */
function symbols(text: string): number[] {
  const out: number[] = [];
  const allDigits = /^\d+$/.test(text);
  if (allDigits && text.length >= 2) {
    // Nombre de chiffres impair : le 1er en jeu B, puis le reste par paires.
    let i = 0;
    if (text.length % 2 === 1) { out.push(START_B, text.charCodeAt(0) - 32, CODE_C); i = 1; }
    else out.push(START_C);
    for (; i < text.length; i += 2) out.push(Number(text.slice(i, i + 2)));
    return out;
  }
  out.push(START_B);
  for (const ch of text) out.push(ch.charCodeAt(0) - 32);
  return out;
}

/** Les modules du code : '1' = noir, '0' = blanc (sans les marges). */
export function encodeCode128(text: string): string {
  if (!canEncodeCode128(text)) throw new Error('Code 128 impossible');
  const s = symbols(text);
  // Contrôle : symbole de départ + somme (valeur × position), modulo 103.
  const check = s.reduce((sum, v, i) => sum + v * (i === 0 ? 1 : i), 0) % 103;
  const widths = [...s, check].map((v) => PATTERNS[v]).join('') + STOP;
  let bits = '';
  [...widths].forEach((w, i) => { bits += (i % 2 === 0 ? '1' : '0').repeat(Number(w)); });
  return bits;
}

