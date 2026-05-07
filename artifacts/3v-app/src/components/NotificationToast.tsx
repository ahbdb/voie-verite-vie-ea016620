import { Bell, BookOpen, Calendar, MessageCircle, Info, AlertCircle, PhoneCall } from 'lucide-react';

export type NotifType = 'greeting' | 'reminder' | 'announcement' | 'update' | 'reading' | 'activity' | 'prayer' | 'info' | 'call';

interface NotificationToastProps {
  title: string;
  message: string;
  type: NotifType;
  link?: string | null;
  onOpen?: () => void;
  onDismiss?: () => void;
  isCall?: boolean;
}

const typeConfig: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
  call:         { icon: <PhoneCall className="w-4 h-4" />,       color: 'text-green-600',  bg: 'bg-green-500' },
  greeting:     { icon: <MessageCircle className="w-4 h-4" />,   color: 'text-primary',    bg: 'bg-primary' },
  prayer:       { icon: <MessageCircle className="w-4 h-4" />,   color: 'text-primary',    bg: 'bg-primary' },
  reminder:     { icon: <AlertCircle className="w-4 h-4" />,     color: 'text-amber-600',  bg: 'bg-amber-500' },
  announcement: { icon: <Info className="w-4 h-4" />,            color: 'text-blue-600',   bg: 'bg-blue-500' },
  update:       { icon: <BookOpen className="w-4 h-4" />,        color: 'text-indigo-600', bg: 'bg-indigo-500' },
  reading:      { icon: <BookOpen className="w-4 h-4" />,        color: 'text-indigo-600', bg: 'bg-indigo-500' },
  activity:     { icon: <Calendar className="w-4 h-4" />,        color: 'text-orange-600', bg: 'bg-orange-500' },
  info:         { icon: <Info className="w-4 h-4" />,            color: 'text-muted-foreground', bg: 'bg-muted-foreground' },
};

export const NotificationToast = ({
  title,
  message,
  type,
  link,
  onOpen,
  onDismiss,
  isCall,
}: NotificationToastProps) => {
  const cfg = typeConfig[type] ?? typeConfig.info;

  return (
    <div
      className="flex items-start gap-3 w-full cursor-pointer select-none"
      onClick={() => {
        if (link) onOpen?.();
      }}
    >
      <div className={`flex-shrink-0 w-10 h-10 rounded-full ${cfg.bg} flex items-center justify-center text-white shadow-sm`}>
        {cfg.icon}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-xs font-semibold text-muted-foreground tracking-wide uppercase">
            Voie Vérité Vie
          </span>
          {isCall && (
            <span className="text-xs font-bold text-green-600 animate-pulse">● EN DIRECT</span>
          )}
        </div>
        <p className="text-sm font-semibold text-foreground leading-tight truncate">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 leading-snug">{message}</p>
      </div>

      <img
        src="/logo-3v.png"
        alt="3V"
        className="flex-shrink-0 w-8 h-8 rounded-lg object-cover opacity-80"
        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
      />
    </div>
  );
};
