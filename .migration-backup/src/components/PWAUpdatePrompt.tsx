import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const PWAUpdatePrompt = () => {
  const [showPrompt, setShowPrompt] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    // Check if update is already available
    if (window.__pwaUpdateAvailable) {
      setShowPrompt(true);
    }

    // Listen for future updates
    const listener = () => setShowPrompt(true);
    window.__pwaUpdateListeners?.add(listener);
    return () => { window.__pwaUpdateListeners?.delete(listener); };
  }, []);

  const handleUpdate = async () => {
    setUpdating(true);
    try {
      await window.__pwaUpdateSW?.(true);
    } catch {
      window.location.reload();
    }
  };

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          className="fixed bottom-4 left-4 right-4 z-[9999] mx-auto max-w-sm"
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        >
          <div className="rounded-xl border border-primary/20 bg-card shadow-2xl p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <RefreshCw className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">Mise à jour disponible</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Une nouvelle version de l'application est prête.
                </p>
              </div>
              <button
                onClick={() => setShowPrompt(false)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex gap-2 mt-3">
              <Button
                size="sm"
                className="flex-1"
                onClick={handleUpdate}
                disabled={updating}
              >
                {updating ? (
                  <RefreshCw className="w-4 h-4 mr-1.5 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-1.5" />
                )}
                {updating ? 'Mise à jour...' : 'Mettre à jour'}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowPrompt(false)}
              >
                Plus tard
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PWAUpdatePrompt;
