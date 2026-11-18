// Lire un code-barres sur l'image de la caméra.
// 1. Si le téléphone a un lecteur intégré (Chrome sur Android) : on l'utilise, c'est le plus rapide.
// 2. Sinon (iPhone) : on charge ZXing, le lecteur de secours.

export type FrameDecoder = (video: HTMLVideoElement) => Promise<string | null>;

const FORMATS = ['ean_13', 'ean_8', 'upc_a'];
const MAX_WIDTH = 960; // on réduit l'image : plus rapide, et largement assez net

interface NativeDetector { detect(source: HTMLVideoElement): Promise<{ rawValue: string }[]> }
interface NativeDetectorClass {
  new (options: { formats: string[] }): NativeDetector;
  getSupportedFormats?: () => Promise<string[]>;
}

async function nativeDecoder(): Promise<FrameDecoder | null> {
  const Detector = (globalThis as { BarcodeDetector?: NativeDetectorClass }).BarcodeDetector;
  if (!Detector) return null;
  try {
    const supported = (await Detector.getSupportedFormats?.()) ?? FORMATS;
    const formats = FORMATS.filter((f) => supported.includes(f));
    if (!formats.length) return null;
    const detector = new Detector({ formats });
    return async (video) => (await detector.detect(video))[0]?.rawValue ?? null;
  } catch {
    return null; // lecteur intégré présent mais inutilisable : on passe au lecteur de secours
  }
}

async function zxingDecoder(): Promise<FrameDecoder> {
  const { decodeImage } = await import('./zxingDecoder');
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Canvas indisponible');
  return async (video) => {
    const scale = Math.min(1, MAX_WIDTH / video.videoWidth);
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    return decodeImage(data, width, height);
  };
}

export async function createDecoder(): Promise<FrameDecoder> {
  return (await nativeDecoder()) ?? zxingDecoder();
}

export const cameraSupported = () => typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;
