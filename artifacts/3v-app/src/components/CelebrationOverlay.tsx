import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { loadFeasts, checkFeastToday, type ChristianFeast } from '@/lib/christian-feasts';
import { X } from 'lucide-react';

const DISMISSED_KEY = '3v-celebration-dismissed';

function wasDismissedToday(feastId: string): boolean {
  try {
    const stored = localStorage.getItem(DISMISSED_KEY);
    if (!stored) return false;
    const data = JSON.parse(stored) as Record<string, string>;
    const today = new Date().toISOString().slice(0, 10);
    return data[feastId] === today;
  } catch { return false; }
}

function markDismissed(feastId: string): void {
  try {
    const stored = localStorage.getItem(DISMISSED_KEY);
    const data = stored ? JSON.parse(stored) : {};
    const today = new Date().toISOString().slice(0, 10);
    data[feastId] = today;
    const trimmed: Record<string, string> = {};
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    for (const [k, v] of Object.entries(data)) {
      if (new Date(v as string) > oneWeekAgo) trimmed[k] = v as string;
    }
    localStorage.setItem(DISMISSED_KEY, JSON.stringify(trimmed));
  } catch {}
}

/* ─── Garland particles ────────────────────────────────────────────── */
function Garlands() {
  const beads = Array.from({ length: 40 }, (_, i) => i);
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {beads.map((i) => (
        <motion.div
          key={i}
          className="absolute w-3 h-3 rounded-full"
          style={{
            left: `${(i / 40) * 100}%`,
            background: ['#c9a227', '#ef4444', '#22c55e', '#3b82f6', '#f59e0b', '#a855f7'][i % 6],
          }}
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: [0, 8, 0], opacity: [0, 1, 1, 0] }}
          transition={{ duration: 3 + (i % 3), delay: (i * 0.08), repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
    </div>
  );
}

/* ─── Falling sparkles ─────────────────────────────────────────────── */
function FallingSparkles({ color }: { color: string }) {
  const particles = Array.from({ length: 25 }, (_, i) => i);
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((i) => (
        <motion.div
          key={i}
          className="absolute text-lg"
          style={{ left: `${Math.random() * 95}%`, top: `-5%` }}
          initial={{ y: -50, opacity: 0, rotate: 0 }}
          animate={{ y: '110vh', opacity: [0, 1, 1, 0], rotate: 360 * (i % 2 === 0 ? 1 : -1) }}
          transition={{ duration: 3 + Math.random() * 3, delay: Math.random() * 4, repeat: Infinity, ease: 'linear' }}
        >
          {['✨', '🌟', '⭐', '🎊', '🎉', '✝️', '🌸'][i % 7]}
        </motion.div>
      ))}
    </div>
  );
}

/* ─── Candles ────────────────────────────────────────────────────── */
function Candles() {
  return (
    <div className="absolute bottom-0 left-0 right-0 flex justify-center gap-8 pointer-events-none pb-2">
      {[0, 1, 2, 3, 4].map(i => (
        <div key={i} className="flex flex-col items-center">
          <motion.div
            className="w-1 h-2 rounded-full"
            style={{ background: '#f5c842' }}
            animate={{ opacity: [1, 0.3, 1], scaleX: [1, 1.5, 1] }}
            transition={{ duration: 0.8 + i * 0.1, repeat: Infinity, ease: 'easeInOut' }}
          />
          <div className="w-3 rounded-sm" style={{ height: 36 + i * 8, background: '#f0ead6' }} />
        </div>
      ))}
    </div>
  );
}

/* ─── Dove animation ───────────────────────────────────────────────── */
function DoveAnimation() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[0, 1, 2].map(i => (
        <motion.div
          key={i}
          className="absolute text-4xl"
          initial={{ x: '-10%', y: `${20 + i * 25}%`, opacity: 0 }}
          animate={{ x: '110%', y: [`${20 + i * 25}%`, `${15 + i * 25}%`, `${20 + i * 25}%`], opacity: [0, 1, 1, 0] }}
          transition={{ duration: 6 + i * 2, delay: i * 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          🕊️
        </motion.div>
      ))}
    </div>
  );
}

/* ─── Cross beam ──────────────────────────────────────────────────── */
function CrossBeam({ color }: { color: string }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: [0, 0.15, 0], scale: [0.5, 2, 3] }}
        transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
        className="w-32 h-32 rounded-full"
        style={{ background: `radial-gradient(circle, ${color}80 0%, transparent 70%)` }}
      />
    </div>
  );
}

/* ─── Main overlay ────────────────────────────────────────────────── */
const CelebrationOverlay = () => {
  const [feast, setFeast] = useState<ChristianFeast | null>(null);
  const [visible, setVisible] = useState(false);
  const checkedRef = useRef(false);

  useEffect(() => {
    if (checkedRef.current) return undefined;
    checkedRef.current = true;
    const feasts = loadFeasts();
    const today = checkFeastToday(feasts);
    if (today && !wasDismissedToday(today.id)) {
      setFeast(today);
      const timer = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, []);

  const dismiss = () => {
    if (feast) markDismissed(feast.id);
    setVisible(false);
  };

  if (!feast) return null;

  const renderAnimation = () => {
    switch (feast.animationType) {
      case 'garland': return <Garlands />;
      case 'fireworks': return <FallingSparkles color={feast.color} />;
      case 'candles': return <Candles />;
      case 'dove': return <DoveAnimation />;
      case 'cross': return <CrossBeam color={feast.color} />;
      case 'banner':
      default: return <FallingSparkles color={feast.color} />;
    }
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-[999] flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.72)' }}
          onClick={dismiss}
        >
          {renderAnimation()}

          <motion.div
            initial={{ scale: 0.7, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: -20 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.1 }}
            className="relative z-10 mx-4 max-w-sm w-full rounded-2xl overflow-hidden shadow-2xl"
            style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', border: `2px solid ${feast.color}60` }}
            onClick={e => e.stopPropagation()}
          >
            {/* Gold shimmer top bar */}
            <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, transparent, ${feast.color}, transparent)` }} />

            <div className="p-6 text-center space-y-4">
              {/* Icon */}
              <motion.div
                animate={{ rotate: [0, -10, 10, -5, 5, 0], scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                className="text-6xl"
              >
                {feast.icon}
              </motion.div>

              {/* Type badge */}
              <div className="flex justify-center">
                <span className="text-[10px] uppercase tracking-widest font-cinzel px-3 py-1 rounded-full border" style={{ color: feast.color, borderColor: `${feast.color}40`, background: `${feast.color}10` }}>
                  {feast.type === 'solemnity' ? 'Solennité' : feast.type === 'feast' ? 'Fête' : feast.type === 'memorial' ? 'Mémorial' : feast.type === 'anniversary' ? 'Anniversaire' : 'Célébration'}
                </span>
              </div>

              {/* Name */}
              <h2 className="text-2xl font-cinzel font-bold text-white leading-snug">{feast.name}</h2>

              {/* Message */}
              <p className="text-sm text-slate-300 font-inter leading-relaxed">{feast.message}</p>

              {/* Animated line */}
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.8, delay: 0.5 }}
                className="h-px w-full"
                style={{ background: `linear-gradient(90deg, transparent, ${feast.color}, transparent)` }}
              />

              {/* Dismiss */}
              <button
                onClick={dismiss}
                className="w-full py-2.5 rounded-xl text-sm font-inter font-medium transition-all hover:opacity-90"
                style={{ background: feast.color, color: '#0f172a' }}
              >
                ✨ Qu'il en soit ainsi
              </button>
            </div>

            {/* Close icon */}
            <button onClick={dismiss} className="absolute top-3 right-3 text-slate-500 hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CelebrationOverlay;
