import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Heart } from 'lucide-react';
import DonationModal from './DonationModal';

const FloatingSupportButton = () => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label={t('donation.floatingAriaLabel')}
        className={`
          fixed bottom-6 right-4 z-40
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
        <span>{t('donation.floatingBtn')}</span>
      </button>

      <DonationModal open={open} onOpenChange={setOpen} />
    </>
  );
};

export default FloatingSupportButton;
