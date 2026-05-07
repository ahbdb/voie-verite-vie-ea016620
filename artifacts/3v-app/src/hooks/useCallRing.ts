import { useCallback, useEffect, useRef } from 'react';

/**
 * WhatsApp-style call ring tone.
 * - Plays a soft repeating ring when `ringing=true`
 * - Generates the tone via WebAudio (no external file needed)
 * - Automatically stops when `ringing` becomes false
 */
export function useCallRing(ringing: boolean): {
  playRing: () => void;
  stopRing: () => void;
} {
  const ctxRef = useRef<AudioContext | null>(null);
  const intervalRef = useRef<number | null>(null);
  const activeRef = useRef(false);

  const getCtx = useCallback((): AudioContext | null => {
    try {
      if (!ctxRef.current || ctxRef.current.state === 'closed') {
        ctxRef.current = new AudioContext();
      }
      if (ctxRef.current.state === 'suspended') {
        ctxRef.current.resume().catch(() => {});
      }
      return ctxRef.current;
    } catch {
      return null;
    }
  }, []);

  /** Play one single "beep-beep" ring cycle (≈ 1.2 s) */
  const ringOnce = useCallback(() => {
    const ctx = getCtx();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Two beeps per ring: 0.0s and 0.5s
    [0, 0.5].forEach((offset) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(620, now + offset);        // first partial
      osc.frequency.linearRampToValueAtTime(680, now + offset + 0.08);
      osc.frequency.linearRampToValueAtTime(620, now + offset + 0.18);

      gain.gain.setValueAtTime(0, now + offset);
      gain.gain.linearRampToValueAtTime(0.25, now + offset + 0.02);
      gain.gain.setValueAtTime(0.25, now + offset + 0.16);
      gain.gain.linearRampToValueAtTime(0, now + offset + 0.22);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + offset);
      osc.stop(now + offset + 0.25);
    });
  }, [getCtx]);

  const stopRing = useCallback(() => {
    activeRef.current = false;
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const playRing = useCallback(() => {
    if (activeRef.current) return;
    activeRef.current = true;
    ringOnce();
    intervalRef.current = window.setInterval(() => {
      if (!activeRef.current) { stopRing(); return; }
      ringOnce();
    }, 2_000);
  }, [ringOnce, stopRing]);

  useEffect(() => {
    if (ringing) {
      playRing();
    } else {
      stopRing();
    }
    return stopRing;
  }, [ringing, playRing, stopRing]);

  useEffect(() => {
    return () => {
      stopRing();
      ctxRef.current?.close().catch(() => {});
    };
  }, [stopRing]);

  return { playRing, stopRing };
}
