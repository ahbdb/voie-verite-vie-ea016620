import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Builds a Blob URL for a 100ms silent WAV. Returns null on failure. */
function createSilentWavUrl(): string | null {
  try {
    const sampleRate = 44100;
    const numSamples = Math.ceil(sampleRate * 0.1); // 100 ms
    const dataSize = numSamples * 2;                 // 16-bit mono
    const buf = new ArrayBuffer(44 + dataSize);
    const v = new DataView(buf);
    const ws = (offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) v.setUint8(offset + i, str.charCodeAt(i));
    };
    ws(0, 'RIFF'); v.setUint32(4, 36 + dataSize, true);
    ws(8, 'WAVE'); ws(12, 'fmt '); v.setUint32(16, 16, true);
    v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, sampleRate, true); v.setUint32(28, sampleRate * 2, true);
    v.setUint16(32, 2, true); v.setUint16(34, 16, true);
    ws(36, 'data'); v.setUint32(40, dataSize, true);
    // Remaining bytes are 0 (silence)
    return URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }));
  } catch {
    return null;
  }
}

export interface ActiveCallInfo {
  roomId: string;
  roomTitle: string;
  roomType: string;
  isAdmin: boolean;
  startedAt: Date;
}

interface CallSessionContextValue {
  activeCall: ActiveCallInfo | null;
  isConnected: boolean;
  isMicEnabled: boolean;
  participantCount: number;
  startCall: (info: ActiveCallInfo) => void;
  endCallSession: () => void;
  notifyConnected: (connected: boolean) => void;
  notifyMic: (enabled: boolean) => void;
  notifyParticipants: (count: number) => void;
  setSoftLeaveCallback: (fn: (() => void) | null) => void;
  getHangUpFn: () => (() => Promise<void>) | null;
  setHangUpFn: (fn: (() => Promise<void>) | null) => void;
  getMicToggleFn: () => (() => void) | null;
  setMicToggleFn: (fn: (() => void) | null) => void;
  /** Call this inside a user-gesture handler (e.g. "Join" click) so browsers
   *  allow the silent audio to autoplay later even when the page is hidden. */
  primeAudioPlayback: () => void;
}

const CallSessionContext = createContext<CallSessionContextValue>({
  activeCall: null,
  isConnected: false,
  isMicEnabled: true,
  participantCount: 0,
  startCall: () => {},
  endCallSession: () => {},
  notifyConnected: () => {},
  notifyMic: () => {},
  notifyParticipants: () => {},
  setSoftLeaveCallback: () => {},
  getHangUpFn: () => null,
  setHangUpFn: () => {},
  getMicToggleFn: () => null,
  setMicToggleFn: () => {},
  primeAudioPlayback: () => {},
});

export const useCallSession = () => useContext(CallSessionContext);

export const CallSessionProvider = ({ children }: { children: React.ReactNode }) => {
  const [activeCall, setActiveCall] = useState<ActiveCallInfo | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isMicEnabled, setIsMicEnabled] = useState(true);
  const [participantCount, setParticipantCount] = useState(0);

  const softLeaveCallbackRef = useRef<(() => void) | null>(null);
  const hangUpFnRef = useRef<(() => Promise<void>) | null>(null);
  const micToggleFnRef = useRef<(() => void) | null>(null);

  // ── Silent audio keepalive ─────────────────────────────────────────────────
  // Lives in this global context (never unmounts) so it keeps the browser's
  // audio subsystem active even after the user navigates away from the call
  // page. This prevents mobile browsers from throttling ICE keepalive timers,
  // which would otherwise drop the WebRTC connection and cut the outgoing audio.
  const silentAudioRef = useRef<HTMLAudioElement | null>(null);
  const silentBlobUrlRef = useRef<string | null>(null);

  const stopSilentAudio = useCallback(() => {
    if (silentAudioRef.current) {
      silentAudioRef.current.pause();
      silentAudioRef.current.src = '';
      silentAudioRef.current = null;
    }
    if (silentBlobUrlRef.current) {
      URL.revokeObjectURL(silentBlobUrlRef.current);
      silentBlobUrlRef.current = null;
    }
  }, []);

  const startSilentAudio = useCallback(() => {
    // Already running — nothing to do
    if (silentAudioRef.current && !silentAudioRef.current.paused) return;

    const url = createSilentWavUrl();
    if (!url) return;

    // Reuse existing element if present, otherwise create a fresh one
    const audio = silentAudioRef.current ?? new Audio();
    audio.src = url;
    audio.loop = true;
    audio.volume = 0.001; // inaudible but "playing"
    audio.play().catch(() => {
      // Autoplay blocked — will retry on the next user gesture via primeAudioPlayback
    });

    if (silentBlobUrlRef.current && silentBlobUrlRef.current !== url) {
      URL.revokeObjectURL(silentBlobUrlRef.current);
    }
    silentBlobUrlRef.current = url;
    silentAudioRef.current = audio;
  }, []);

  /**
   * Call this synchronously inside any user-gesture handler (e.g. the "Join"
   * button click). This unlocks autoplay on iOS/Android so that later calls to
   * startSilentAudio() succeed even when the page is in the background.
   */
  const primeAudioPlayback = useCallback(() => {
    // Create a tiny audio element and immediately play+pause to unlock autoplay.
    // This must be called synchronously inside a user-gesture event handler.
    try {
      const unlock = new Audio();
      unlock.src = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';
      const p = unlock.play();
      if (p) p.then(() => unlock.pause()).catch(() => {});
    } catch { /* ignore */ }
  }, []);

  // Start/stop the silent audio in sync with the connected state.
  // This effect runs in the global provider — it is NOT cleaned up when the
  // call-room component unmounts, only when isConnected transitions to false.
  useEffect(() => {
    if (isConnected) {
      startSilentAudio();
    } else {
      stopSilentAudio();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected]);

  // Also ensure the silent audio resumes after the page becomes visible again
  // (some browsers suspend audio elements while hidden).
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && isConnected) {
        startSilentAudio();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [isConnected, startSilentAudio]);

  // ── Call session helpers ───────────────────────────────────────────────────

  const startCall = useCallback((info: ActiveCallInfo) => {
    setActiveCall(info);
    setIsConnected(false);
    setIsMicEnabled(true);
    setParticipantCount(0);
  }, []);

  const endCallSession = useCallback(() => {
    setActiveCall(null);
    setIsConnected(false);
    setParticipantCount(0);
    softLeaveCallbackRef.current = null;
    hangUpFnRef.current = null;
    micToggleFnRef.current = null;
    stopSilentAudio();
  }, [stopSilentAudio]);

  const notifyConnected = useCallback((v: boolean) => setIsConnected(v), []);
  const notifyMic = useCallback((v: boolean) => setIsMicEnabled(v), []);
  const notifyParticipants = useCallback((n: number) => setParticipantCount(n), []);
  const setSoftLeaveCallback = useCallback((fn: (() => void) | null) => { softLeaveCallbackRef.current = fn; }, []);
  const getHangUpFn = useCallback(() => hangUpFnRef.current, []);
  const setHangUpFn = useCallback((fn: (() => Promise<void>) | null) => { hangUpFnRef.current = fn; }, []);
  const getMicToggleFn = useCallback(() => micToggleFnRef.current, []);
  const setMicToggleFn = useCallback((fn: (() => void) | null) => { micToggleFnRef.current = fn; }, []);

  return (
    <CallSessionContext.Provider value={{
      activeCall,
      isConnected,
      isMicEnabled,
      participantCount,
      startCall,
      endCallSession,
      notifyConnected,
      notifyMic,
      notifyParticipants,
      setSoftLeaveCallback,
      getHangUpFn,
      setHangUpFn,
      getMicToggleFn,
      setMicToggleFn,
      primeAudioPlayback,
    }}>
      {children}
    </CallSessionContext.Provider>
  );
};
