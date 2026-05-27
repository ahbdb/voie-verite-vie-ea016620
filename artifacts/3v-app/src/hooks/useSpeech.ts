/**
 * useSpeech — Synthèse vocale avec Gemini TTS (prioritaire) ou Web Speech API (fallback).
 *
 * Interface identique à l'ancienne version, avec un paramètre onEnd optionnel
 * dans speak() pour éviter le polling sur window.speechSynthesis.speaking.
 */
import { useState, useCallback, useEffect, useRef } from 'react';

// ── Gemini TTS ────────────────────────────────────────────────────────────────
const GEMINI_TTS_MODEL = 'gemini-3.1-flash-tts-preview';
const GEMINI_TTS_VOICE = 'Aoede';

function base64PcmToWavBlob(base64: string, sampleRate = 24000): Blob {
  const bin = atob(base64);
  const pcm = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) pcm[i] = bin.charCodeAt(i);

  const numCh = 1, bps = 16;
  const byteRate = (sampleRate * numCh * bps) / 8;
  const blockAlign = (numCh * bps) / 8;
  const buf = new ArrayBuffer(44 + pcm.length);
  const v = new DataView(buf);
  const w4 = (o: number, s: string) => { for (let i = 0; i < 4; i++) v.setUint8(o + i, s.charCodeAt(i)); };

  w4(0, 'RIFF'); v.setUint32(4, 36 + pcm.length, true);
  w4(8, 'WAVE'); w4(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, numCh, true);
  v.setUint32(24, sampleRate, true); v.setUint32(28, byteRate, true);
  v.setUint16(32, blockAlign, true); v.setUint16(34, bps, true);
  w4(36, 'data'); v.setUint32(40, pcm.length, true);
  new Uint8Array(buf).set(pcm, 44);

  return new Blob([buf], { type: 'audio/wav' });
}

// ── Web Speech API (fallback) ─────────────────────────────────────────────────
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

// ── Interface publique ────────────────────────────────────────────────────────
export interface UseSpeechReturn {
  /** onEnd() est appelé quand la lecture se termine (natif ou Gemini). */
  speak: (text: string, onEnd?: () => void) => void;
  stop: () => void;
  speaking: boolean;
  supported: boolean;
}

export const useSpeech = (rate = 0.82): UseSpeechReturn => {
  const [speaking, setSpeaking] = useState(false);

  const apiKey    = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
  const useGemini = !!apiKey;
  const supported =
    useGemini ||
    (typeof window !== 'undefined' && 'speechSynthesis' in window);

  const audioRef   = useRef<HTMLAudioElement | null>(null);
  const blobUrlRef = useRef<string | null>(null);
  const abortRef   = useRef<AbortController | null>(null);
  const utterRef   = useRef<SpeechSynthesisUtterance | null>(null);

  const cleanupAudio = useCallback(() => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ''; audioRef.current = null; }
    if (blobUrlRef.current) { URL.revokeObjectURL(blobUrlRef.current); blobUrlRef.current = null; }
  }, []);

  useEffect(() => () => {
    abortRef.current?.abort();
    cleanupAudio();
    if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel();
  }, [cleanupAudio]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    cleanupAudio();
    if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel();
    setSpeaking(false);
  }, [cleanupAudio]);

  const speak = useCallback(
    (text: string, onEnd?: () => void) => {
      if (!text.trim()) return;
      stop();

      if (useGemini && apiKey) {
        // ── Gemini TTS ──────────────────────────────────────────────────────
        console.log('[3V TTS] → Gemini TTS (clé présente)');
        setSpeaking(true);
        const controller = new AbortController();
        abortRef.current = controller;

        void (async () => {
          try {
            const res = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_TTS_MODEL}:generateContent?key=${apiKey}`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                signal: controller.signal,
                body: JSON.stringify({
                  contents: [{ parts: [{ text }] }],
                  generationConfig: {
                    responseModalities: ['AUDIO'],
                    speechConfig: {
                      voiceConfig: { prebuiltVoiceConfig: { voiceName: GEMINI_TTS_VOICE } },
                    },
                  },
                }),
              },
            );

            if (!res.ok) throw new Error(`Gemini TTS HTTP ${res.status}`);
            const data = await res.json() as unknown;
            const b64 = (data as { candidates?: { content?: { parts?: { inlineData?: { data?: string } }[] } }[] })
              ?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
            if (!b64) throw new Error('Pas de données audio Gemini');

            const blob = base64PcmToWavBlob(b64);
            const url  = URL.createObjectURL(blob);
            blobUrlRef.current = url;

            const audio = new Audio(url);
            audioRef.current = audio;
            audio.onended = () => { cleanupAudio(); setSpeaking(false); onEnd?.(); };
            audio.onerror = () => { cleanupAudio(); setSpeaking(false); onEnd?.(); };
            await audio.play();
          } catch (err: unknown) {
            if ((err as Error)?.name === 'AbortError') return;
            console.warn('[useSpeech] Gemini TTS échoué, fallback Web Speech:', err);
            // Fallback Web Speech API
            if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
              const utter = new SpeechSynthesisUtterance(text);
              utter.lang = FR_LANG;
              utter.rate = rate;
              utter.onend   = () => { setSpeaking(false); onEnd?.(); };
              utter.onerror = () => { setSpeaking(false); onEnd?.(); };
              utterRef.current = utter;
              window.speechSynthesis.speak(utter);
            } else {
              setSpeaking(false);
              onEnd?.();
            }
          }
        })();
      } else {
        // ── Web Speech API ──────────────────────────────────────────────────
        console.log('[3V TTS] → Web Speech API (pas de clé Gemini)');
        if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

        const utter = new SpeechSynthesisUtterance(text);
        utter.lang   = FR_LANG;
        utter.rate   = rate;
        utter.pitch  = 1.0;
        utter.volume = 1.0;
        const voice = getBestFrVoice();
        if (voice) utter.voice = voice;

        utter.onstart = () => setSpeaking(true);
        utter.onend   = () => { setSpeaking(false); onEnd?.(); };
        utter.onerror = () => { setSpeaking(false); onEnd?.(); };
        utter.onpause = () => setSpeaking(false);
        utterRef.current = utter;
        window.speechSynthesis.speak(utter);
      }
    },
    [useGemini, apiKey, rate, stop, cleanupAudio],
  );

  return { speak, stop, speaking, supported };
};
