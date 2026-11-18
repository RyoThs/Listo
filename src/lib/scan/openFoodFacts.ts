// Trouver le nom d'un produit à partir de son code-barres, grâce à Open Food Facts :
// une base de données gratuite et collaborative (association française, données libres).
// Seul le numéro du code-barres est envoyé : rien sur toi ni sur tes listes.
// Demande internet ; sans réseau, LISTO te propose d'écrire le nom toi-même.

export type ProductLookup =
  | { status: 'found'; name: string }
  | { status: 'unknown' }  // produit absent de la base
  | { status: 'offline' }; // pas d'internet, ou la base ne répond pas

const API = 'https://world.openfoodfacts.org/api/v2/product/';
const FIELDS = 'product_name_fr,product_name,generic_name_fr,brands';
export const MAX_NAME = 60;

/** Nettoie un nom venu d'internet (on ne fait jamais confiance à ce qu'on reçoit). */
export function cleanProductName(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  // eslint-disable-next-line no-control-regex
  return raw.replace(/[\u0000-\u001f\u007f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, MAX_NAME).trim();
}

/** Choisit le meilleur nom dans la réponse : nom français, sinon nom général, sinon la marque. */
export function pickProductName(data: unknown): string {
  const p = (data as { product?: Record<string, unknown> } | null)?.product;
  if (!p || typeof p !== 'object') return '';
  const brand = cleanProductName(typeof p.brands === 'string' ? p.brands.split(',')[0] : '');
  return cleanProductName(p.product_name_fr) || cleanProductName(p.product_name) || cleanProductName(p.generic_name_fr) || brand;
}

export async function lookupProduct(code: string, fetchFn: typeof fetch = fetch, timeoutMs = 7000): Promise<ProductLookup> {
  if (!/^\d{8,14}$/.test(code)) return { status: 'unknown' };
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return { status: 'offline' };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetchFn(`${API}${code}.json?fields=${FIELDS}`, { signal: controller.signal });
    if (res.status === 404) return { status: 'unknown' };
    if (!res.ok) return { status: 'offline' };
    const name = pickProductName(await res.json());
    return name ? { status: 'found', name } : { status: 'unknown' };
  } catch {
    return { status: 'offline' }; // réseau coupé, trop lent, ou réponse illisible
  } finally {
    clearTimeout(timer);
  }
}
