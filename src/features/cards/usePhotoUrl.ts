import { useEffect, useState } from 'react';
import { photoUrl } from '../../lib/photo';
import type { StoredPhoto } from '../../types';

/** Crée l'adresse d'affichage d'une photo et la libère quand on n'en a plus besoin. */
export function usePhotoUrl(photo: StoredPhoto | undefined) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!photo) { setUrl(null); return; }
    const u = photoUrl(photo);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [photo]);
  return url;
}
