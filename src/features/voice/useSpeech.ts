import { useCallback, useEffect, useRef, useState } from 'react';

// Saisie à la voix avec la reconnaissance vocale du navigateur.
// Très bien supportée par Chrome sur Android ; sur iPhone, Safari la propose selon la version d'iOS.

/* eslint-disable @typescript-eslint/no-explicit-any */
type Recognition = any;
const getCtor = (): (new () => Recognition) | undefined =>
  typeof window === 'undefined' ? undefined : (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;

export function useSpeech(onFinal: (text: string) => void) {
  const supported = !!getCtor();
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<Recognition | null>(null);
  const finalRef = useRef(onFinal);
  finalRef.current = onFinal;

  const stop = useCallback(() => recRef.current?.stop(), []);

  const start = useCallback(() => {
    const Ctor = getCtor();
    if (!Ctor) return;
    setError(null);
    const rec = new Ctor();
    rec.lang = 'fr-FR';
    rec.interimResults = true;
    rec.continuous = false;
    rec.onresult = (e: any) => {
      let text = '';
      let isFinal = false;
      for (let i = e.resultIndex; i < e.results.length; i++) {
        text += e.results[i][0].transcript;
        if (e.results[i].isFinal) isFinal = true;
      }
      if (isFinal) { setInterim(''); finalRef.current(text.trim()); }
      else setInterim(text);
    };
    rec.onerror = (e: any) => {
      setError(
        e.error === 'not-allowed' || e.error === 'service-not-allowed'
          ? 'Autorise le micro dans les réglages du navigateur.'
          : e.error === 'no-speech' ? "Je n'ai rien entendu, réessaie."
          : e.error === 'network' ? 'La voix demande internet sur ce téléphone. Tape au clavier.'
          : 'La saisie vocale a échoué.',
      );
    };
    rec.onend = () => { setListening(false); setInterim(''); };
    recRef.current = rec;
    setListening(true);
    rec.start();
  }, []);

  useEffect(() => () => recRef.current?.abort?.(), []);
  return { supported, listening, interim, error, start, stop };
}
