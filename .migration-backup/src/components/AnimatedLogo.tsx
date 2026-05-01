import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import logo3v from '@/assets/logo-3v.png';

interface AnimatedLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizes = {
  sm: 'w-10 h-10',
  md: 'w-16 h-16',
  lg: 'w-24 h-24',
  xl: 'w-36 h-36',
};

const AnimatedLogo = ({ size = 'md', className = '' }: AnimatedLogoProps) => {
  const { t } = useTranslation();
  const s = sizes[size];

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      {/* Outer rotating golden ring */}
      <motion.div
        className={`absolute ${s} rounded-full`}
        style={{
          border: '2px solid transparent',
          borderTopColor: 'hsl(var(--cathedral-gold))',
          borderRightColor: 'hsl(var(--cathedral-gold) / 0.3)',
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
      />

      {/* Second counter-rotating ring */}
      <motion.div
        className={`absolute ${s} rounded-full`}
        style={{
          border: '1px solid transparent',
          borderBottomColor: 'hsl(var(--cathedral-gold) / 0.6)',
          borderLeftColor: 'hsl(var(--cathedral-gold) / 0.15)',
          scale: 1.15,
        }}
        animate={{ rotate: -360 }}
        transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
      />

      {/* Pulsing glow behind logo */}
      <motion.div
        className={`absolute ${s} rounded-full bg-cathedral-gold/10`}
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.3, 0.08, 0.3],
        }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Second glow layer offset */}
      <motion.div
        className={`absolute ${s} rounded-full bg-cathedral-gold/5`}
        animate={{
          scale: [1.2, 1.6, 1.2],
          opacity: [0.15, 0.03, 0.15],
        }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
      />

      {/* Sparkle dots */}
      {[0, 60, 120, 180, 240, 300].map((deg, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full bg-cathedral-gold"
          style={{
            transformOrigin: 'center',
          }}
          animate={{
            opacity: [0, 1, 0],
            scale: [0, 1.2, 0],
            x: [0, Math.cos((deg * Math.PI) / 180) * 38, 0],
            y: [0, Math.sin((deg * Math.PI) / 180) * 38, 0],
          }}
          transition={{
            duration: 2.5,
            repeat: Infinity,
            delay: i * 0.4,
            ease: 'easeInOut',
          }}
        />
      ))}

      {/* Logo with breathing scale + subtle float */}
      <motion.div
        className={`relative ${s} z-10`}
        animate={{
          scale: [1, 1.05, 1],
          y: [0, -2, 0],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        <motion.img
          src={logo3v}
          alt={t('brand.logoAlt')}
          className="w-full h-full object-contain drop-shadow-[0_0_15px_hsl(var(--cathedral-gold)/0.4)]"
          initial={{ opacity: 0, scale: 0.5, rotate: -10 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </motion.div>
    </div>
  );
};

export default AnimatedLogo;
