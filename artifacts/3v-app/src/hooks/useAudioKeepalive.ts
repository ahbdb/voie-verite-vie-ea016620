import { useEffect, useRef } from 'react';

/**
 * Keeps the browser's audio pipeline alive when the tab goes to background.
 *
 * The problem: mobile browsers (especially iOS Safari and some Android browsers)
 * suspend the AudioContext and can throttle or mute <video> srcObject playback
 * when the tab is not visible — cutting off remote participant audio.
 *
 * The solution (used by WhatsApp Web, Google Meet, Zoom):
 * Play a perfectly silent looping audio buffer through a REAL AudioContext node.
 * This signals to the OS that the page is actively producing audio, preventing
 * the browser from suspending audio playback for all elements on the page.
 *
 * A gain node at 0.0001 (not exactly 0) is used because some browsers skip
 * silent-zero buffers; the volume is imperceptible to humans.
 */
export function useAudioKeepalive(active: boolean): void {
  const ctxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);

  useEffect(() => {
    if (!active) {
      stopSilence();
      return;
    }

    startSilence();
    // Re-create if OS suspended the context while in background
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        resumeIfSuspended();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      stopSilence();
    };
  }, [active]);

  function getOrCreateCtx(): AudioContext | null {
    try {
      if (!ctxRef.current || ctxRef.current.state === 'closed') {
        ctxRef.current = new AudioContext({ sampleRate: 8000 });
      }
      return ctxRef.current;
    } catch {
      return null;
    }
  }

  function startSilence() {
    const ctx = getOrCreateCtx();
    if (!ctx) return;
    if (sourceRef.current) return; // already running

    try {
      // 1-second silent buffer at 8kHz (minimal CPU usage)
      const buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      // Leave buffer data as zeros — it's silent

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, ctx.currentTime); // imperceptible, not zero
      gainRef.current = gain;

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      source.connect(gain);
      gain.connect(ctx.destination);
      source.start();
      sourceRef.current = source;

      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
    } catch {}
  }

  function stopSilence() {
    try { sourceRef.current?.stop(); } catch {}
    sourceRef.current = null;
    gainRef.current = null;
    try {
      if (ctxRef.current && ctxRef.current.state !== 'closed') {
        ctxRef.current.close().catch(() => {});
      }
    } catch {}
    ctxRef.current = null;
  }

  function resumeIfSuspended() {
    const ctx = ctxRef.current;
    if (!ctx) { startSilence(); return; }
    if (ctx.state === 'suspended') {
      ctx.resume()
        .then(() => { if (!sourceRef.current) startSilence(); })
        .catch(() => {});
    } else if (ctx.state === 'closed') {
      startSilence();
    }
  }
}
