import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Mic, MicOff, PhoneOff, PhoneCall, BookOpen } from 'lucide-react';
import { useCallSession } from '@/contexts/CallSessionContext';
import { cn } from '@/lib/utils';

export const FloatingCallBanner = () => {
  const { activeCall, isConnected, isMicEnabled, participantCount, endCallSession, getHangUpFn, getMicToggleFn, primeAudioPlayback } = useCallSession();
  const navigate = useNavigate();
  const location = useLocation();
  const [elapsed, setElapsed] = useState(0);
  const [leaving, setLeaving] = useState(false);

  const isOnMeetingPage =
    activeCall &&
    (location.pathname === `/meeting/${activeCall.roomId}` ||
      location.pathname === `/admin/video/${activeCall.roomId}`);

  useEffect(() => {
    if (!activeCall || !isConnected) { setElapsed(0); return; }
    const start = activeCall.startedAt.getTime();
    const update = () => setElapsed(Math.floor((Date.now() - start) / 1000));
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [activeCall, isConnected]);

  if (!activeCall || isOnMeetingPage) return null;

  const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const typeEmoji = activeCall.roomType === 'audio' ? '🎙' : activeCall.roomType === 'live' ? '📡' : '📹';

  const handleReturn = () => {
    primeAudioPlayback(); // unlock audio on iOS/Android before navigating back
    navigate(`/meeting/${activeCall.roomId}`);
  };

  const handleHangUp = async () => {
    setLeaving(true);
    try {
      const fn = getHangUpFn();
      if (fn) await fn();
    } finally {
      endCallSession();
      setLeaving(false);
    }
  };

  const handleToggleMic = () => {
    const fn = getMicToggleFn();
    if (fn) fn();
  };

  return (
    <div
      className={cn(
        'fixed bottom-0 left-0 right-0 z-[9999] flex items-center gap-3 px-4 py-3',
        'bg-green-600 text-white shadow-[0_-4px_20px_rgba(0,0,0,0.3)]',
        'animate-in slide-in-from-bottom duration-300'
      )}
    >
      <button
        onClick={handleReturn}
        className="flex flex-1 items-center gap-3 min-w-0 text-left"
      >
        <div className="flex-shrink-0 w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
          <PhoneCall className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold truncate">
            {typeEmoji} {activeCall.roomTitle}
          </p>
          <p className="text-[10px] text-green-100">
            {isConnected ? fmt(elapsed) : 'Reconnexion…'} · {participantCount} participant{participantCount !== 1 ? 's' : ''}
          </p>
        </div>
        <span className="flex-shrink-0 text-xs font-bold text-green-100 animate-pulse">
          Appuyer pour revenir
        </span>
      </button>

      <button
        onClick={() => { primeAudioPlayback(); navigate('/messe-office'); }}
        className="flex-shrink-0 w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
        title="Texte liturgique du jour"
      >
        <BookOpen className="w-4 h-4" />
      </button>

      <button
        onClick={handleToggleMic}
        className={cn(
          'flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-colors',
          isMicEnabled
            ? 'bg-white/20 hover:bg-white/30'
            : 'bg-red-500 hover:bg-red-600'
        )}
        title={isMicEnabled ? 'Couper le micro' : 'Activer le micro'}
      >
        {isMicEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
      </button>

      <button
        onClick={handleHangUp}
        disabled={leaving}
        className="flex-shrink-0 w-10 h-10 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-colors disabled:opacity-50"
        title="Raccrocher"
      >
        <PhoneOff className="w-4 h-4" />
      </button>
    </div>
  );
};
