/**
 * useWebSpeech — Reconnaissance vocale (STT) + synthèse (TTS via Gemini).
 *
 * STT : Web Speech API (SpeechRecognition) — inchangé.
 * TTS : Google Gemini TTS (gemini-2.5-flash-preview-tts) si VITE_GEMINI_API_KEY
 *       est défini, sinon fallback Web Speech API speechSynthesis.
 */
import { useState, useCallback, useRef, useEffect } from 'react';

// ── Gemini TTS helpers ────────────────────────────────────────────────────────
const GEMINI_TTS_MODEL = 'gemini-3.1-flash-tts-preview';
const GEMINI_TTS_VOICE = 'Aoede';

function splitIntoChunks(text: string, maxLen = 250): string[] {
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

async function fetchChunkBlob(text: string, apiKey: string, signal: AbortSignal): Promise<Blob> {
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
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: GEMINI_TTS_VOICE } } },
        },
      }),
    },
  );
  if (!res.ok) throw new Error(`Gemini TTS HTTP ${res.status}`);
  const data = await res.json() as unknown;
  const b64 = (data as { candidates?: { content?: { parts?: { inlineData?: { data?: string } }[] } }[] })
    ?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!b64) throw new Error('Pas de données audio');
  return base64PcmToWavBlob(b64);
}

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

// ── Options ───────────────────────────────────────────────────────────────────
interface UseWebSpeechOptions {
  onResult?: (text: string) => void;
  onError?: (error: string) => void;
  timeout?: number;   // ms avant arrêt auto du micro
  language?: string;
}

export const useWebSpeech = (options: UseWebSpeechOptions = {}) => {
  // ── État STT ──────────────────────────────────────────────────────────────
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const optionsRef     = useRef(options);
  const timeoutRef     = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── État TTS ──────────────────────────────────────────────────────────────
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioRef      = useRef<HTMLAudioElement | null>(null);
  const blobUrlRef    = useRef<string | null>(null);
  const abortTTSRef   = useRef<AbortController | null>(null);
  const utteranceRef  = useRef<SpeechSynthesisUtterance | null>(null);

  const apiKey    = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
  const useGemini = !!apiKey;

  // Mettre à jour les options sans recréer le hook
  useEffect(() => { optionsRef.current = options; }, [options]);

  // ── Cleanup audio ─────────────────────────────────────────────────────────
  const cleanupAudio = useCallback(() => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ''; audioRef.current = null; }
    if (blobUrlRef.current) { URL.revokeObjectURL(blobUrlRef.current); blobUrlRef.current = null; }
  }, []);

  // Cleanup global sur unmount
  useEffect(() => () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (_) {}
    }
    abortTTSRef.current?.abort();
    cleanupAudio();
    try { speechSynthesis.cancel(); } catch (_) {}
  }, [cleanupAudio]);

  // ── STT : startListening ──────────────────────────────────────────────────
  const startListening = useCallback(() => {
    try {
      // @ts-ignore
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        optionsRef.current.onError?.('Web Speech API non supportée sur ce navigateur');
        return;
      }
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (_) {}
      }

      const recognition = new SpeechRecognition();
      recognition.lang = optionsRef.current.language || 'fr-FR';
      recognition.continuous      = false;
      recognition.interimResults  = true;
      recognition.maxAlternatives = 1;

      let finalTranscript = '';
      let hasStarted      = false;

      recognition.onstart = () => {
        hasStarted = true;
        setIsListening(true);
        finalTranscript = '';
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        const ms = optionsRef.current.timeout || 10000;
        timeoutRef.current = setTimeout(() => { try { recognition.stop(); } catch (_) {} }, ms);
      };

      recognition.onend = () => {
        setIsListening(false);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        if (finalTranscript.trim()) {
          optionsRef.current.onResult?.(finalTranscript.trim());
        } else if (hasStarted) {
          optionsRef.current.onError?.('Aucun son détecté. Veuillez réessayer.');
        }
      };

      recognition.onresult = (event: any) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript + ' ';
          }
        }
      };

      recognition.onerror = (event: any) => {
        setIsListening(false);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        const msgs: Record<string, string> = {
          'no-speech':           'Pas de son détecté. Veuillez parler plus fort.',
          'audio-capture':       'Erreur du microphone. Vérifiez les permissions.',
          'network':             'Erreur réseau. Vérifiez votre connexion.',
          'aborted':             'Reconnaissance vocale interrompue.',
          'service-not-allowed': 'Service non autorisé par le navigateur.',
          'bad-grammar':         'Erreur de grammaire vocale.',
          'unknown':             'Erreur inconnue.',
        };
        optionsRef.current.onError?.(msgs[event.error] || `Erreur: ${event.error}`);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (error) {
      optionsRef.current.onError?.(`Erreur d'initialisation: ${String(error)}`);
      setIsListening(false);
    }
  }, []);

  // ── STT : stopListening ───────────────────────────────────────────────────
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (_) {}
    }
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsListening(false);
  }, []);

  // ── TTS : stopSpeaking ────────────────────────────────────────────────────
  const stopSpeaking = useCallback(() => {
    abortTTSRef.current?.abort();
    abortTTSRef.current = null;
    cleanupAudio();
    try { speechSynthesis.cancel(); utteranceRef.current = null; } catch (_) {}
    setIsSpeaking(false);
  }, [cleanupAudio]);

  // ── TTS : jouer les chunks dans l'ordre ──────────────────────────────────
  const playInOrder = useCallback(
    (blobs: Promise<Blob>[], index: number, controller: AbortController) => {
      if (controller.signal.aborted) return;
      if (index >= blobs.length) { cleanupAudio(); setIsSpeaking(false); return; }
      blobs[index]
        .then((blob) => {
          if (controller.signal.aborted) return;
          const url = URL.createObjectURL(blob);
          blobUrlRef.current = url;
          const audio = new Audio(url);
          audioRef.current = audio;
          audio.onplay  = () => setIsSpeaking(true);
          audio.onended = () => playInOrder(blobs, index + 1, controller);
          audio.onerror = () => playInOrder(blobs, index + 1, controller);
          audio.play().catch(() => playInOrder(blobs, index + 1, controller));
        })
        .catch((err: unknown) => {
          if ((err as Error)?.name === 'AbortError') return;
          playInOrder(blobs, index + 1, controller);
        });
    },
    [cleanupAudio],
  );

  // ── TTS : speak ───────────────────────────────────────────────────────────
  const speak = useCallback(
    (text: string) => {
      if (!text.trim()) {
        optionsRef.current.onError?.('Aucun texte à lire.');
        return;
      }
      stopSpeaking();

      if (useGemini && apiKey) {
        // ── Gemini TTS avec chunking parallèle ──────────────────────────────
        setIsSpeaking(true);
        const controller = new AbortController();
        abortTTSRef.current = controller;
        const chunks = splitIntoChunks(text);
        const blobs  = chunks.map(c => fetchChunkBlob(c, apiKey, controller.signal));
        playInOrder(blobs, 0, controller);
      } else {
        // ── Web Speech API ──────────────────────────────────────────────────
        if (!('speechSynthesis' in window)) {
          optionsRef.current.onError?.('Text-to-Speech non supportée');
          return;
        }

        const utter = new SpeechSynthesisUtterance(text);
        utter.lang  = optionsRef.current.language || 'fr-FR';
        utter.rate  = 0.95;
        utter.pitch = 1.0;
        utter.volume = 1.0;

        utter.onstart = () => setIsSpeaking(true);
        utter.onend   = () => { setIsSpeaking(false); utteranceRef.current = null; };
        utter.onerror = (e: any) => {
          optionsRef.current.onError?.(`Erreur synthèse vocale: ${e.error}`);
          setIsSpeaking(false); utteranceRef.current = null;
        };
        utteranceRef.current = utter;
        speechSynthesis.speak(utter);
      }
    },
    [useGemini, apiKey, stopSpeaking, cleanupAudio],
  );

  // ── isSupported ───────────────────────────────────────────────────────────
  const isSupported = useCallback(() => {
    return (
      ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) &&
      ('speechSynthesis' in window || !!apiKey)
    );
  }, [apiKey]);

  return {
    isListening,
    isSpeaking,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
    isSupported,
  };
};
