import { useState, useRef, useCallback, useEffect } from 'react';

export function useAudio() {
  const [playing, setPlaying] = useState(false);
  const ref = useRef<HTMLAudioElement | null>(null);

  const stop = useCallback(() => {
    if (ref.current) {
      ref.current.pause();
      ref.current.currentTime = 0;
      ref.current = null;
    }
    setPlaying(false);
  }, []);

  const play = useCallback((url: string) => {
    stop();
    const audio = new Audio(url);
    ref.current = audio;
    audio.onplay = () => setPlaying(true);
    audio.onended = () => { setPlaying(false); ref.current = null; };
    audio.onerror = () => { setPlaying(false); ref.current = null; };
    audio.play().catch(() => { setPlaying(false); ref.current = null; });
  }, [stop]);

  useEffect(() => () => stop(), [stop]);

  return { play, stop, playing };
}
