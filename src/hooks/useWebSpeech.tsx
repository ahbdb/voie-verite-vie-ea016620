import { useState, useCallback, useRef, useEffect } from 'react';

interface UseWebSpeechOptions {
  onResult?: (text: string) => void;
  onError?: (error: string) => void;
  timeout?: number; // ms avant arrêt auto du micro
  language?: string;
}

export const useWebSpeech = (options: UseWebSpeechOptions = {}) => {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const recognitionRef = useRef<any>(null);
  const optionsRef = useRef(options);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const speechCancelledRef = useRef(false);
  const activeUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const splitTextForSpeech = useCallback((text: string) => {
    const normalized = text.replace(/\s+/g, ' ').trim();
    if (!normalized) return [];

    const sentences = normalized.match(/[^.!?]+[.!?]?/g) || [normalized];
    const chunks: string[] = [];

    sentences.forEach((sentence) => {
      const trimmed = sentence.trim();
      if (!trimmed) return;

      const previous = chunks[chunks.length - 1];
      if (previous && `${previous} ${trimmed}`.length <= 220) {
        chunks[chunks.length - 1] = `${previous} ${trimmed}`;
      } else {
        chunks.push(trimmed);
      }
    });

    return chunks;
  }, []);

  // Mettre à jour les options sans recréer le hook
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  // Cleanup sur unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Déjà arrêté
        }
      }

      try {
        speechCancelledRef.current = true;
        speechSynthesis.cancel();
        activeUtteranceRef.current = null;
      } catch (e) {
        // Déjà arrêté
      }
    };
  }, []);

  const startListening = useCallback(() => {
    try {
      // @ts-ignore - Web Speech API n'est pas dans les types par défaut
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

      if (!SpeechRecognition) {
        optionsRef.current.onError?.('Web Speech API non supportée sur ce navigateur');
        return;
      }

      // Arrêter la reconnaissance précédente si elle est active
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Ignorer
        }
      }

      const recognition = new SpeechRecognition();
      recognition.lang = optionsRef.current.language || 'fr-FR';
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      let finalTranscript = '';
      let hasStarted = false;

      recognition.onstart = () => {
        hasStarted = true;
        setIsListening(true);
        finalTranscript = '';

        // Configurer un timeout pour arrêter automatiquement
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        const timeoutMs = optionsRef.current.timeout || 10000; // 10s par défaut

        timeoutRef.current = setTimeout(() => {
          try {
            recognition.stop();
          } catch (e) {
            // Déjà arrêté
          }
        }, timeoutMs);
      };

      recognition.onend = () => {
        setIsListening(false);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);

        // Envoyer le résultat final même s'il est partiel
        if (finalTranscript.trim()) {
          optionsRef.current.onResult?.(finalTranscript.trim());
        } else if (hasStarted) {
          optionsRef.current.onError?.('Aucun son détecté. Veuillez réessayer.');
        }
      };

      recognition.onresult = (event: any) => {
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;

          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }
      };

      recognition.onerror = (event: any) => {
        setIsListening(false);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);

        const errorMessages: { [key: string]: string } = {
          'no-speech': 'Pas de son détecté. Veuillez parler plus fort.',
          'audio-capture': 'Erreur du microphone. Vérifiez les permissions.',
          network: 'Erreur réseau. Vérifiez votre connexion.',
          aborted: 'Reconnaissance vocale interrompue.',
          'service-not-allowed': 'Service non autorisé par le navigateur.',
          'bad-grammar': 'Erreur de grammaire vocale.',
          unknown: 'Erreur inconnue.',
        };

        const errorMsg = errorMessages[event.error] || `Erreur: ${event.error}`;
        optionsRef.current.onError?.(errorMsg);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (error) {
      optionsRef.current.onError?.(`Erreur d'initialisation: ${String(error)}`);
      setIsListening(false);
    }
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // Déjà arrêté
      }
    }
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsListening(false);
  }, []);

  const speak = useCallback(
    (text: string) => {
      try {
        if (!('speechSynthesis' in window)) {
          optionsRef.current.onError?.('Text-to-Speech non supportée');
          return;
        }

        const chunks = splitTextForSpeech(text);
        if (!chunks.length) {
          optionsRef.current.onError?.('Aucun texte à lire.');
          return;
        }

        speechCancelledRef.current = false;
        speechSynthesis.cancel();

        const language = optionsRef.current.language || 'fr-FR';

        const playChunk = (index: number) => {
          if (speechCancelledRef.current) {
            setIsSpeaking(false);
            activeUtteranceRef.current = null;
            return;
          }

          const chunk = chunks[index];
          if (!chunk) {
            setIsSpeaking(false);
            activeUtteranceRef.current = null;
            return;
          }

          const utterance = new SpeechSynthesisUtterance(chunk);
          utterance.lang = language;
          utterance.rate = 0.95;
          utterance.pitch = 1.0;
          utterance.volume = 1.0;

          utterance.onstart = () => setIsSpeaking(true);
          utterance.onend = () => {
            if (speechCancelledRef.current) {
              setIsSpeaking(false);
              activeUtteranceRef.current = null;
              return;
            }

            if (index < chunks.length - 1) {
              playChunk(index + 1);
              return;
            }

            setIsSpeaking(false);
            activeUtteranceRef.current = null;
          };

          utterance.onerror = (event: any) => {
            optionsRef.current.onError?.(`Erreur synthèse vocale: ${event.error}`);
            setIsSpeaking(false);
            activeUtteranceRef.current = null;
          };

          activeUtteranceRef.current = utterance;
          speechSynthesis.speak(utterance);
        };

        playChunk(0);
      } catch (error) {
        optionsRef.current.onError?.(`Erreur synthèse: ${String(error)}`);
      }
    },
    [splitTextForSpeech]
  );

  const stopSpeaking = useCallback(() => {
    try {
      speechCancelledRef.current = true;
      speechSynthesis.cancel();
      activeUtteranceRef.current = null;
    } catch (e) {
      // Déjà arrêté
    }
    setIsSpeaking(false);
  }, []);

  const isSupported = useCallback(() => {
    return ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) && 'speechSynthesis' in window;
  }, []);

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
