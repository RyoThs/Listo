import type { StoredPhoto } from '../types';

// Outils pour les photos des cartes de fidélité.

const MAX_SIDE = 1600; // assez net pour qu'une caisse lise le code-barres, sans remplir le téléphone
export const MAX_PHOTO_BYTES = 8 * 1024 * 1024;

/** Charge l'image (photo de la galerie ou de l'appareil photo), dans le bon sens. */
async function loadImage(file: Blob): Promise<ImageBitmap | HTMLImageElement> {
  if ('createImageBitmap' in window) {
    try { return await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch { /* on essaie autrement */ }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Prépare une photo : on la réduit (une photo d'iPhone fait souvent 3 à 5 Mo) et on la garde en JPEG.
 * Si le téléphone n'y arrive pas, on garde la photo d'origine si elle n'est pas trop lourde.
 */
export async function preparePhoto(file: File): Promise<StoredPhoto> {
  if (!file.type.startsWith('image/') && file.type !== '') throw new Error('not-image');
  try {
    const img = await loadImage(file);
    const w = img.width, h = img.height;
    const scale = Math.min(1, MAX_SIDE / Math.max(w, h));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(w * scale);
    canvas.height = Math.round(h * scale);
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    if ('close' in img) img.close();
    const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, 'image/jpeg', 0.85));
    if (blob) return { data: await blob.arrayBuffer(), type: 'image/jpeg' };
  } catch { /* repli juste en dessous */ }
  if (file.size > MAX_PHOTO_BYTES) throw new Error('too-big');
  return { data: await file.arrayBuffer(), type: file.type || 'image/jpeg' };
}

/** Adresse temporaire pour afficher la photo dans une balise <img>. Penser à URL.revokeObjectURL. */
export const photoUrl = (p: StoredPhoto) => URL.createObjectURL(new Blob([p.data], { type: p.type }));

// ---------- Pour la sauvegarde (fichier texte) : photo ⇄ texte « data:image/jpeg;base64,… » ----------

export function photoToDataUrl(p: StoredPhoto): string {
  const bytes = new Uint8Array(p.data);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return `data:${p.type};base64,${btoa(bin)}`;
}

const DATA_URL = /^data:(image\/(?:jpeg|png|webp|gif|heic|heif));base64,([A-Za-z0-9+/=]+)$/;

/** Lit une photo d'un fichier de sauvegarde. Renvoie undefined si ce n'est pas une image valide. */
export function dataUrlToPhoto(text: unknown): StoredPhoto | undefined {
  if (typeof text !== 'string' || text.length > MAX_PHOTO_BYTES * 1.4) return undefined;
  const m = DATA_URL.exec(text);
  if (!m) return undefined;
  try {
    const bin = atob(m[2]);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return { data: bytes.buffer, type: m[1] };
  } catch {
    return undefined;
  }
}
