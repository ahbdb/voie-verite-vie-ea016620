/**
 * useGeminiTTS — Synthèse vocale via Google Gemini TTS.
 * Modèle : gemini-2.5-flash-preview-tts (gratuit)
 *
 * Prérequis : VITE_GEMINI_API_KEY dans .env.local
 * Si la clé est absente, supported = false (aucune lecture).
 *
 * L'API Gemini TTS renvoie du PCM brut (24 kHz, 16-bit, mono) encodé en base64.
 * On le convertit en WAV et on le joue via un élément <audio> standard.
 */
import { useState, useRef, useCallback, useEffect } from 'react';

const GEMINI_TTS_MODEL = 'gemini-3.1-flash-tts-preview';
const GEMINI_TTS_VOICE = 'Aoede'; // Voix naturelle, convient aux prières françaises

// ── PCM brut (24 kHz, 16-bit, mono) → Blob WAV ───────────────────────────────
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
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);        // format PCM
  v.setUint16(22, numCh, true);
  v.setUint32(24, sampleRate, true);
  v.setUint32(28, byteRate, true);
  v.setUint16(32, blockAlign, true);
  v.setUint16(34, bps, true);
  w4(36, 'data'); v.setUint32(40, pcm.length, true);
  new Uint8Array(buf).set(pcm, 44);

  return new Blob([buf], { type: 'audio/wav' });
}

// ── Interface publique ────────────────────────────────────────────────────────
export interface UseGeminiTTSReturn {
  /** Démarre la lecture du texte. onEnd() est appelé à la fin. */
  speak: (text: string, onEnd?: () => void) => void;
  /** Arrête la lecture immédiatement. */
  stop: () => void;
  /** Met en pause (ne fait rien si non actif). */
  pause: () => void;
  /** Reprend depuis la position de pause. */
  resume: () => void;
  /** true pendant l'appel API (avant que l'audio ne démarre). */
  loading: boolean;
  /** true pendant la lecture audio. */
  speaking: boolean;
  /** true quand l'audio est en pause. */
  paused: boolean;
  /** false si VITE_GEMINI_API_KEY n'est pas définie. */
  supported: boolean;
}

export function useGeminiTTS(): UseGeminiTTSReturn {
  const [speaking, setSpeaking] = useState(false);
  const [paused,   setPaused]   = useState(false);
  const [loading,  setLoading]  = useState(false);

  const audioRef   = useRef<HTMLAudioElement | null>(null);
  const blobUrlRef = useRef<string | null>(null);
  const abortRef   = useRef<AbortController | null>(null);

  const apiKey   = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
  const supported = !!apiKey;

  // ── nettoyage ─────────────────────────────────────────────────────────────
  const cleanup = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
  }, []);

  useEffect(() => () => {
    abortRef.current?.abort();
    cleanup();
  }, [cleanup]);

  // ── stop ──────────────────────────────────────────────────────────────────
  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    cleanup();
    setSpeaking(false);
    setPaused(false);
    setLoading(false);
  }, [cleanup]);

  // ── pause / resume ────────────────────────────────────────────────────────
  const pause = useCallback(() => {
    if (audioRef.current && speaking && !paused) {
      audioRef.current.pause();
      setPaused(true);
    }
  }, [speaking, paused]);

  const resume = useCallback(() => {
    if (audioRef.current && paused) {
      audioRef.current.play().catch(() => {});
      setPaused(false);
    }
  }, [paused]);

  // ── speak ─────────────────────────────────────────────────────────────────
  const speak = useCallback(
    (text: string, onEnd?: () => void) => {
      if (!apiKey || !text.trim()) return;
      stop();
      setLoading(true);

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
                    voiceConfig: {
                      prebuiltVoiceConfig: { voiceName: GEMINI_TTS_VOICE },
                    },
                  },
                },
              }),
            },
          );

          if (!res.ok) throw new Error(`Gemini TTS HTTP ${res.status}`);

          const data = await res.json() as unknown;
          const b64 = (data as { candidates?: { content?: { parts?: { inlineData?: { data?: string } }[] } }[] })
            ?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
          if (!b64) throw new Error('Pas de données audio dans la réponse Gemini');

          const blob = base64PcmToWavBlob(b64);
          const url  = URL.createObjectURL(blob);
          blobUrlRef.current = url;

          const audio = new Audio(url);
          audioRef.current = audio;

          audio.onplay  = () => { setSpeaking(true); setPaused(false); setLoading(false); };
          audio.onended = () => { cleanup(); setSpeaking(false); setPaused(false); onEnd?.(); };
          audio.onerror = () => { cleanup(); setSpeaking(false); setLoading(false); onEnd?.(); };

          setLoading(false);
          await audio.play();
        } catch (err: unknown) {
          if ((err as Error)?.name === 'AbortError') return;
          console.error('[useGeminiTTS]', err);
          cleanup();
          setSpeaking(false);
          setLoading(false);
          onEnd?.();
        }
      })();
    },
    [apiKey, stop, cleanup],
  );

  return { speak, stop, pause, resume, loading, speaking, paused, supported };
}
