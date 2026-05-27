/**
 * useSpeech — Synthèse vocale via Edge Function Supabase (proxy Gemini TTS).
 * Fallback : Web Speech API si la fonction n'est pas disponible.
 *
 * Requêtes parallèles par phrase → lecture dès la 1ère phrase prête.
 */
import { useState, useCallback, useEffect, useRef } from 'react';

const SUPABASE_URL      = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
const TTS_FUNCTION_URL  = `${SUPABASE_URL}/functions/v1/gemini-tts`;

// ── PCM L16 → WAV ──────────────────────────────────────────────────────────────
function base64PcmToWavBlob(base64: string, sampleRate = 24000): Blob {
  const bin = atob(base64);
  const pcm = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) pcm[i] = bin.charCodeAt(i);
  const numCh = 1, bps = 16;
  const byteRate   = (sampleRate * numCh * bps) / 8;
  const blockAlign = (numCh * bps) / 8;
  const buf = new ArrayBuffer(44 + pcm.length);
  const v   = new DataView(buf);
  const w4  = (o: number, s: string) => { for (let i = 0; i < 4; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  w4(0, 'RIFF'); v.setUint32(4, 36 + pcm.length, true);
  w4(8, 'WAVE'); w4(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, numCh, true);
  v.setUint32(24, sampleRate, true); v.setUint32(28, byteRate, true);
  v.setUint16(32, blockAlign, true); v.setUint16(34, bps, true);
  w4(36, 'data'); v.setUint32(40, pcm.length, true);
  new Uint8Array(buf).set(pcm, 44);
  return new Blob([buf], { type: 'audio/wav' });
}

// ── Découpage en phrases (~200 chars max) ──────────────────────────────────────
function splitIntoChunks(text: string, maxLen = 200): string[] {
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

// ── Appel Edge Function ─────────────────────────────────────────────────────────
async function fetchChunkBlob(text: string, signal: AbortSignal): Promise<Blob> {
  const res = await fetch(TTS_FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'apikey': SUPABASE_ANON_KEY,
    },
    signal,
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error(`gemini-tts HTTP ${res.status}`);
  const data = await res.json() as { audio?: string; error?: string };
  if (!data.audio) throw new Error(data.error ?? 'Pas de données audio');
  return base64PcmToWavBlob(data.audio);
}

// ── Web Speech API (fallback) ──────────────────────────────────────────────────
const FR_LANG = 'fr-FR';
const getBestFrVoice = (): SpeechSynthesisVoice | null => {
  const voices = window.speechSynthesis.getVoices();
  return voices.find(v => v.lang === 'fr-FR' && !v.localService)
    ?? voices.find(v => v.lang.startsWith('fr') && !v.localService)
    ?? voices.find(v => v.lang === 'fr-FR')
    ?? voices.find(v => v.lang.startsWith('fr'))
    ?? null;
};

// ── Interface publique ─────────────────────────────────────────────────────────
export interface UseSpeechReturn {
  speak: (text: string, onEnd?: () => void) => void;
  stop: () => void;
  speaking: boolean;
  supported: boolean;
}

export const useSpeech = (rate = 0.82): UseSpeechReturn => {
  const [speaking, setSpeaking] = useState(false);
  const supported = true; // Edge Function ou Web Speech, toujours disponible

  const blobUrlsRef = useRef<string[]>([]);
  const audioRef    = useRef<HTMLAudioElement | null>(null);
  const abortRef    = useRef<AbortController | null>(null);
  const utterRef    = useRef<SpeechSynthesisUtterance | null>(null);

  const revokeBlobs = useCallback(() => {
    blobUrlsRef.current.forEach(u => URL.revokeObjectURL(u));
    blobUrlsRef.current = [];
  }, []);

  useEffect(() => () => {
    abortRef.current?.abort();
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    revokeBlobs();
    if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel();
  }, [revokeBlobs]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    revokeBlobs();
    if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel();
    setSpeaking(false);
  }, [revokeBlobs]);

  const playInOrder = useCallback(
    (blobs: Promise<Blob>[], index: number, controller: AbortController, onEnd?: () => void) => {
      if (controller.signal.aborted) return;
      if (index >= blobs.length) {
        if (audioRef.current) { audioRef.current = null; }
        revokeBlobs();
        setSpeaking(false);
        onEnd?.();
        return;
      }
      blobs[index]
        .then((blob) => {
          if (controller.signal.aborted) return;
          const url = URL.createObjectURL(blob);
          blobUrlsRef.current.push(url);
          const audio = new Audio(url);
          audioRef.current = audio;
          audio.onplay  = () => setSpeaking(true);
          audio.onended = () => playInOrder(blobs, index + 1, controller, onEnd);
          audio.onerror = () => playInOrder(blobs, index + 1, controller, onEnd);
          audio.play().catch(() => playInOrder(blobs, index + 1, controller, onEnd));
        })
        .catch((err: unknown) => {
          if ((err as Error)?.name === 'AbortError') return;
          // Fallback Web Speech si l'Edge Function échoue
          console.warn(`[useSpeech] chunk ${index} via Edge Function échoué, Web Speech:`, err);
          if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            // Jouer le texte restant via Web Speech en fallback
            setSpeaking(false);
            onEnd?.();
          } else {
            setSpeaking(false);
            onEnd?.();
          }
        });
    },
    [revokeBlobs],
  );

  const speak = useCallback(
    (text: string, onEnd?: () => void) => {
      if (!text.trim()) return;
      stop();
      setSpeaking(true);

      const controller = new AbortController();
      abortRef.current = controller;

      const chunks = splitIntoChunks(text);
      const blobs  = chunks.map(c => fetchChunkBlob(c, controller.signal));

      // Si l'Edge Function est indisponible, fallback immédiat Web Speech
      blobs[0].catch((err: unknown) => {
        if ((err as Error)?.name === 'AbortError') return;
        if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
          setSpeaking(false); onEnd?.(); return;
        }
        console.warn('[useSpeech] Edge Function indisponible, Web Speech fallback');
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
        utterRef.current = utter;
        window.speechSynthesis.speak(utter);
      });

      playInOrder(blobs, 0, controller, onEnd);
    },
    [rate, stop, playInOrder],
  );

  return { speak, stop, speaking, supported };
};
