/**
 * useGeminiTTS — Synthèse vocale via Google Gemini TTS.
 * Modèle : gemini-3.1-flash-tts-preview
 *
 * Stratégie anti-latence : le texte est découpé en phrases, toutes les requêtes
 * partent en parallèle, la lecture commence dès que la première phrase est prête.
 * Les phrases suivantes sont jouées dans l'ordre sans attente supplémentaire.
 */
import { useState, useRef, useCallback, useEffect } from 'react';

const GEMINI_TTS_MODEL = 'gemini-3.1-flash-tts-preview';
const GEMINI_TTS_VOICE = 'Aoede';

// ── PCM L16 (24 kHz, 16-bit, mono) → Blob WAV ────────────────────────────────
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

// ── Découper en phrases (~200 caractères max par chunk) ───────────────────────
function splitIntoChunks(text: string, maxLen = 250): string[] {
  // Découpe aux fins de phrase puis regroupe tant que ça tient dans maxLen
  const sentences = text.match(/[^.!?;\n]+[.!?;\n]?/g) ?? [text];
  const chunks: string[] = [];
  let current = '';
  for (const s of sentences) {
    const trimmed = s.trim();
    if (!trimmed) continue;
    if (current.length + trimmed.length + 1 <= maxLen) {
      current = current ? `${current} ${trimmed}` : trimmed;
    } else {
      if (current) chunks.push(current);
      current = trimmed;
    }
  }
  if (current) chunks.push(current);
  return chunks.length ? chunks : [text.trim()];
}

// ── Appel API pour un chunk ───────────────────────────────────────────────────
async function fetchChunkBlob(
  text: string,
  apiKey: string,
  signal: AbortSignal,
): Promise<Blob> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_TTS_MODEL}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal,
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
  if (!b64) throw new Error('Pas de données audio dans la réponse Gemini');
  return base64PcmToWavBlob(b64);
}

// ── Interface publique ────────────────────────────────────────────────────────
export interface UseGeminiTTSReturn {
  speak: (text: string, onEnd?: () => void) => void;
  stop: () => void;
  pause: () => void;
  resume: () => void;
  loading: boolean;
  speaking: boolean;
  paused: boolean;
  supported: boolean;
}

export function useGeminiTTS(): UseGeminiTTSReturn {
  const [speaking, setSpeaking] = useState(false);
  const [paused,   setPaused]   = useState(false);
  const [loading,  setLoading]  = useState(false);

  const audioRef    = useRef<HTMLAudioElement | null>(null);
  const blobUrlsRef = useRef<string[]>([]);
  const abortRef    = useRef<AbortController | null>(null);
  const onEndRef    = useRef<(() => void) | undefined>(undefined);

  const apiKey    = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
  const supported = !!apiKey;

  // ── Libérer les blob URLs ────────────────────────────────────────────────
  const revokeBlobs = useCallback(() => {
    blobUrlsRef.current.forEach(u => URL.revokeObjectURL(u));
    blobUrlsRef.current = [];
  }, []);

  // ── Arrêter l'audio en cours ─────────────────────────────────────────────
  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }
    revokeBlobs();
  }, [revokeBlobs]);

  useEffect(() => () => {
    abortRef.current?.abort();
    stopAudio();
  }, [stopAudio]);

  // ── stop ─────────────────────────────────────────────────────────────────
  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    stopAudio();
    setSpeaking(false);
    setPaused(false);
    setLoading(false);
    onEndRef.current = undefined;
  }, [stopAudio]);

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

  // ── Jouer les chunks dans l'ordre ────────────────────────────────────────
  const playInOrder = useCallback(
    (blobs: Promise<Blob>[], index: number, controller: AbortController) => {
      if (controller.signal.aborted) return;
      if (index >= blobs.length) {
        stopAudio();
        setSpeaking(false);
        setPaused(false);
        onEndRef.current?.();
        onEndRef.current = undefined;
        return;
      }

      blobs[index]
        .then((blob) => {
          if (controller.signal.aborted) return;
          const url = URL.createObjectURL(blob);
          blobUrlsRef.current.push(url);

          const audio = new Audio(url);
          audioRef.current = audio;

          audio.onplay   = () => { setSpeaking(true); setPaused(false); setLoading(false); };
          audio.onended  = () => playInOrder(blobs, index + 1, controller);
          audio.onerror  = () => playInOrder(blobs, index + 1, controller);

          audio.play().catch(() => playInOrder(blobs, index + 1, controller));
        })
        .catch((err: unknown) => {
          if ((err as Error)?.name === 'AbortError') return;
          console.error(`[useGeminiTTS] chunk ${index} error:`, err);
          playInOrder(blobs, index + 1, controller);
        });
    },
    [stopAudio],
  );

  // ── speak ─────────────────────────────────────────────────────────────────
  const speak = useCallback(
    (text: string, onEnd?: () => void) => {
      if (!apiKey || !text.trim()) return;
      stop();

      onEndRef.current = onEnd;
      setLoading(true);

      const controller = new AbortController();
      abortRef.current = controller;

      const chunks = splitIntoChunks(text);

      // Lancer TOUTES les requêtes en parallèle
      const blobs = chunks.map(chunk =>
        fetchChunkBlob(chunk, apiKey, controller.signal),
      );

      // Jouer dans l'ordre dès que le premier chunk est prêt
      playInOrder(blobs, 0, controller);
    },
    [apiKey, stop, playInOrder],
  );

  return { speak, stop, pause, resume, loading, speaking, paused, supported };
}
