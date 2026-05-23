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
  // A real DOM <audio> element (rendered below) keeps the browser's audio
  // subsystem active even after the user navigates away from the call page or
  // the phone screen turns off.
  //
  // Why DOM-attached instead of `new Audio()`?
  //   • iOS PWA: Only a DOM-attached <audio> with `playsInline` that was started
  //     during a user gesture is allowed to continue playing in the background.
  //   • Android PWA: Chrome recognises the page as "playing media" and prevents
  //     it from being suspended, keeping ICE keepalive timers alive.
  //
  // The element is kept at volume 0.001 so it is completely inaudible.
  const silentAudioElRef = useRef<HTMLAudioElement | null>(null);
  const silentBlobUrlRef = useRef<string | null>(null);

  const ensureSrc = useCallback(() => {
    const el = silentAudioElRef.current;
    if (!el) return false;
    if (el.src && el.src.startsWith('blob:')) return true; // already loaded
    const url = createSilentWavUrl();
    if (!url) return false;
    if (silentBlobUrlRef.current) URL.revokeObjectURL(silentBlobUrlRef.current);
    silentBlobUrlRef.current = url;
    el.src = url;
    el.loop = true;
    el.volume = 0.001;
    return true;
  }, []);

  const startSilentAudio = useCallback(() => {
    const el = silentAudioElRef.current;
    if (!el) return;
    if (!el.paused) return; // already playing
    if (!ensureSrc()) return;
    el.play().catch(() => {
      // Autoplay was blocked — will retry on the next user gesture via
      // primeAudioPlayback(), which is called on every join/navigate action.
    });
  }, [ensureSrc]);

  const stopSilentAudio = useCallback(() => {
    const el = silentAudioElRef.current;
    if (el) { el.pause(); el.src = ''; }
    if (silentBlobUrlRef.current) {
      URL.revokeObjectURL(silentBlobUrlRef.current);
      silentBlobUrlRef.current = null;
    }
  }, []);

  /**
   * Call synchronously inside EVERY user-gesture handler that navigates to or
   * returns to a call (join button, recall button, return-to-call banner …).
   *
   * On iOS/Android, audio.play() is only allowed when called (directly or
   * indirectly) from within a user-interaction event. Calling this here
   * "unlocks" audio for the duration of the call, including when the page is
   * later moved to the background.
   */
  const primeAudioPlayback = useCallback(() => {
    const el = silentAudioElRef.current;
    if (!el) return;
    if (!ensureSrc()) return;
    // Intentionally do NOT pause — we want this to keep playing as the keepalive.
    el.play().catch(() => {});
  }, [ensureSrc]);

  // Start / stop in sync with the WebRTC connection state
  useEffect(() => {
    if (isConnected) {
      startSilentAudio();
    } else {
      stopSilentAudio();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected]);

  // Resume if the system paused it while the page was hidden (spec-required
  // for Screen Wake Lock; some browsers also pause audio on visibility change)
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
      {/*
        This hidden <audio> element is the audio keepalive.
        It MUST be in the DOM (not just `new Audio()`) so iOS treats it as a
        real media session and allows it to continue in the background.
        playsInline prevents iOS from forcing fullscreen on play.
      */}
      <audio
        ref={silentAudioElRef}
        loop
        playsInline
        aria-hidden="true"
        style={{ display: 'none', position: 'absolute', width: 0, height: 0 }}
      />
    </CallSessionContext.Provider>
  );
};
