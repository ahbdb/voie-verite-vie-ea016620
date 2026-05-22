import { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import DonationModal from './DonationModal';

const STORAGE_KEY = 'support_btn_dismissed_v1';

const FloatingSupportButton = () => {
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Afficher le bouton après 1.5 s pour laisser l'app charger
    const timer = setTimeout(() => setVisible(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Soutenir l'association 3V"
        className={`
          fixed bottom-6 right-4 z-50
          flex items-center gap-2
          bg-primary text-primary-foreground
          rounded-full shadow-lg
          px-4 py-2.5
          text-sm font-semibold
          hover:opacity-90 active:scale-95
          transition-all duration-200
          animate-pulse-once
        `}
        style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.18)' }}
      >
        <Heart className="w-4 h-4 fill-current flex-shrink-0" />
        <span className="hidden xs:inline">Soutenir</span>
      </button>

      <DonationModal open={open} onOpenChange={setOpen} />
    </>
  );
};

export default FloatingSupportButton;
