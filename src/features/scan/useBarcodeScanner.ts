import { useEffect, useRef, useState, type RefObject } from 'react';
import { createDecoder } from '../../lib/scan/decoders';
import { isProductCode } from '../../lib/scan/productCode';
import { reportError } from '../../lib/errors';

export type CameraState = 'starting' | 'running' | 'denied' | 'nocamera' | 'error';

const EVERY_MS = 150; // une image analysée toutes les 150 ms

/**
 * Allume la caméra arrière dans la <video>, lit les codes-barres, et appelle onCode
 * dès qu'un code produit valide est trouvé. onCode renvoie false pour ignorer ce code et continuer.
 * La caméra s'éteint quand `active` repasse à false.
 */
export function useBarcodeScanner(videoRef: RefObject<HTMLVideoElement | null>, active: boolean, onCode: (code: string) => Promise<boolean>) {
  const [state, setState] = useState<CameraState>('starting');
  const onCodeRef = useRef(onCode);
  onCodeRef.current = onCode;

  useEffect(() => {
    if (!active) return;
    let stopped = false;
    let stream: MediaStream | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    setState('starting');

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        const video = videoRef.current;
        if (stopped || !video) return;
        video.srcObject = stream;
        await video.play();
        const decode = await createDecoder();
        if (stopped) return;
        setState('running');

        const tick = async () => {
          if (stopped) return;
          try {
            if (video.readyState >= 2 && video.videoWidth > 0) {
              const code = await decode(video);
              if (stopped) return;
              // UPC-A (12 chiffres) = EAN-13 commençant par 0 : on garde une seule écriture du même produit
              if (code && isProductCode(code) && (await onCodeRef.current(code.length === 12 ? `0${code}` : code))) return;
            }
          } catch (e) {
            reportError(e, 'Lecture du code-barres');
            setState('error');
            return;
          }
          timer = setTimeout(() => void tick(), EVERY_MS);
        };
        void tick();
      } catch (e) {
        if (stopped) return;
        const name = e instanceof DOMException ? e.name : '';
        if (name === 'NotAllowedError' || name === 'SecurityError') setState('denied');
        else if (name === 'NotFoundError' || name === 'OverconstrainedError') setState('nocamera');
        else { reportError(e, 'Caméra'); setState('error'); }
      }
    })();

    return () => {
      stopped = true;
      clearTimeout(timer);
      stream?.getTracks().forEach((t) => t.stop());
      if (videoRef.current) videoRef.current.srcObject = null;
    };
  }, [active, videoRef]);

  return state;
}
