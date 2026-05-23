import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, PhoneOff, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCallSession } from '@/contexts/CallSessionContext';

const SESSION_KEY = '3v-active-call-room';

interface ActiveCallBannerProps {
  isConnected: boolean;
  roomId: string | undefined;
  roomTitle: string | undefined;
  onLeave: () => Promise<void>;
}

/**
 * A sticky green banner that floats at the top of every page when a call
 * is active — exactly like WhatsApp's "tap to return to call" bar.
 * It appears when the user navigates away from the call page, not on the
 * call page itself.
 */
export const ActiveCallBanner = ({
  isConnected,
  roomId,
  roomTitle,
  onLeave,
}: ActiveCallBannerProps) => {
  const navigate = useNavigate();
  const { primeAudioPlayback } = useCallSession();
  const [elapsed, setElapsed] = useState(0);
  const [startTime] = useState(() => Date.now());

  useEffect(() => {
    if (!isConnected) return;
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startTime) / 1000)), 1000);
    return () => clearInterval(id);
  }, [isConnected, startTime]);

  if (!isConnected || !roomId) return null;

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  return (
    <div
      className={cn(
        'fixed top-0 left-0 right-0 z-[9999]',
        'flex items-center justify-between',
        'bg-green-600 text-white',
        'px-4 py-2 shadow-lg',
        'cursor-pointer select-none',
        'transition-all duration-200',
      )}
      onClick={() => { primeAudioPlayback(); navigate(`/meeting/${roomId}`); }}
      role="button"
      aria-label="Revenir à l'appel"
    >
      {/* Left: pulsing dot + title */}
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="flex h-2 w-2 shrink-0">
          <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-white opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
        </span>
        <Phone className="h-3.5 w-3.5 shrink-0" />
        <span className="text-xs font-semibold truncate">
          {roomTitle || 'Appel en cours'} — {formatDuration(elapsed)}
        </span>
      </div>

      {/* Right: return + hang-up */}
      <div className="flex items-center gap-3 shrink-0 ml-3">
        <span className="text-[10px] font-medium opacity-90">Appuyer pour revenir</span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            void onLeave();
          }}
          className="flex items-center gap-1 rounded-full bg-red-500 hover:bg-red-600 px-2.5 py-1 text-[10px] font-bold transition-colors"
          title="Raccrocher"
        >
          <PhoneOff className="h-3 w-3" />
          Raccrocher
        </button>
      </div>
    </div>
  );
};

export default ActiveCallBanner;
