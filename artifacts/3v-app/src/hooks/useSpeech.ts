import { useState, useCallback, useEffect, useRef } from 'react';

const FR_LANG = 'fr-FR';

const getBestFrVoice = (): SpeechSynthesisVoice | null => {
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find((v) => v.lang === 'fr-FR' && !v.localService) ??
    voices.find((v) => v.lang.startsWith('fr') && !v.localService) ??
    voices.find((v) => v.lang === 'fr-FR') ??
    voices.find((v) => v.lang.startsWith('fr')) ??
    null
  );
};

export interface UseSpeechReturn {
  speak: (text: string) => void;
  stop: () => void;
  speaking: boolean;
  supported: boolean;
}

export const useSpeech = (rate = 0.82): UseSpeechReturn => {
  const [speaking, setSpeaking] = useState(false);
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (!supported) return;
    // Voices load asynchronously in Chrome
    window.speechSynthesis.onvoiceschanged = () => {};
    return () => {
      window.speechSynthesis.cancel();
    };
  }, [supported]);

  const speak = useCallback(
    (text: string) => {
      if (!supported) return;
      window.speechSynthesis.cancel();

      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = FR_LANG;
      utter.rate = rate;
      utter.pitch = 1.0;
      utter.volume = 1.0;

      const voice = getBestFrVoice();
      if (voice) utter.voice = voice;

      utter.onstart = () => setSpeaking(true);
      utter.onend = () => setSpeaking(false);
      utter.onerror = () => setSpeaking(false);
      utter.onpause = () => setSpeaking(false);

      utterRef.current = utter;
      window.speechSynthesis.speak(utter);
    },
    [supported, rate],
  );

  const stop = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, [supported]);

  return { speak, stop, speaking, supported };
};
