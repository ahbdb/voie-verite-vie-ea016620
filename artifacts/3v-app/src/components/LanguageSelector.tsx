import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Globe } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const languages = [
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'it', label: 'Italiano', flag: '🇮🇹' },
];

const LanguageSelector = ({ variant = 'icon' }: { variant?: 'icon' | 'full' }) => {
  const { i18n } = useTranslation();
  const currentLang = languages.find(l => l.code === i18n.language) || languages[0];

  const changeLang = (code: string) => {
    i18n.changeLanguage(code);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {variant === 'icon' ? (
          <Button variant="ghost" size="sm" className="gap-1.5">
            <Globe className="w-4 h-4" />
            <span className="text-xs uppercase">{currentLang.code}</span>
          </Button>
        ) : (
          <Button variant="ghost" className="w-full justify-start gap-2">
            <Globe className="w-4 h-4" />
            {currentLang.flag} {currentLang.label}
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {languages.map(lang => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => changeLang(lang.code)}
            className={i18n.language === lang.code ? 'bg-muted font-semibold' : ''}
          >
            <span className="mr-2">{lang.flag}</span>
            {lang.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default LanguageSelector;
