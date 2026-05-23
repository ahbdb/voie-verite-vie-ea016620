import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import logo3v from '@/assets/logo-3v.png';

const LoadingScreen = () => {
  const { t } = useTranslation();
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-heaven animate-fade-in">
      <div className="text-center">
        <div className="mb-8 animate-float">
          <img 
            src={logo3v} 
            alt="Logo 3V" 
            className="h-32 w-auto mx-auto divine-glow"
          />
        </div>
        <h1 className="text-3xl md:text-4xl font-playfair font-bold text-primary mb-4 animate-fade-in-up">
          {t('brand.fullName')}
        </h1>
        <div className="flex justify-center space-x-2">
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-2 h-2 bg-secondary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-2 h-2 bg-accent rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;
