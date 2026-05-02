import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Palette, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useSettings } from '@/hooks/useSettings';
import { PaletteTheme, getAllThemes, getLiturgicalThemes, getCustomThemes } from '@/lib/palette-colors';

export const PaletteSelectorDropdown = () => {
  const { t } = useTranslation();
  const { settings, setColorPalette } = useSettings();
  const [isOpen, setIsOpen] = useState(false);

  const allThemes = getAllThemes();
  const liturgicalThemes = getLiturgicalThemes();
  const customThemes = getCustomThemes();

  const currentTheme = (settings?.colorPalette || 'liturgical') as PaletteTheme;
  const currentThemeName = allThemes.find(t => t.id === currentTheme)?.name || 'Default';

  const handleSelectPalette = (palette: PaletteTheme) => {
    setColorPalette(palette as any);
    setIsOpen(false);
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="gap-2"
          title={t('settings.paletteSelector') || 'Seleziona tema colore'}
        >
          <Palette className="w-4 h-4" />
          <span className="hidden sm:inline text-xs">{currentThemeName}</span>
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-xs font-semibold">
          {t('settings.liturgicalColors') || 'Colori Liturgici'}
        </DropdownMenuLabel>
        
        {liturgicalThemes.map((theme) => (
          <DropdownMenuCheckboxItem
            key={theme.id}
            checked={currentTheme === theme.id}
            onCheckedChange={() => handleSelectPalette(theme.id as PaletteTheme)}
            className="cursor-pointer"
          >
            <div className="flex items-center gap-2 flex-1">
              <div 
                className="w-3 h-3 rounded-full border border-gray-400" 
                style={{ 
                  backgroundColor: getAllThemes().find(t => t.id === theme.id)?.id === theme.id 
                    ? '#2d7a54' 
                    : '#e8e8e8' 
                }}
              />
              <div className="flex-1">
                <p className="text-sm font-medium">{theme.name}</p>
                <p className="text-xs text-muted-foreground">{theme.description}</p>
              </div>
            </div>
          </DropdownMenuCheckboxItem>
        ))}

        <DropdownMenuSeparator />
        
        <DropdownMenuLabel className="text-xs font-semibold">
          {t('settings.customThemes') || 'Temi Personalizzati'}
        </DropdownMenuLabel>
        
        {customThemes.map((theme) => (
          <DropdownMenuCheckboxItem
            key={theme.id}
            checked={currentTheme === theme.id}
            onCheckedChange={() => handleSelectPalette(theme.id as unknown as PaletteTheme)}
            className="cursor-pointer"
          >
            <div className="flex items-center gap-2 flex-1">
              <div 
                className="w-3 h-3 rounded-full border border-gray-400" 
                style={{ 
                  backgroundColor: '#e8e8e8' 
                }}
              />
              <div className="flex-1">
                <p className="text-sm font-medium">{theme.name}</p>
                <p className="text-xs text-muted-foreground">{theme.description}</p>
              </div>
            </div>
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default PaletteSelectorDropdown;
