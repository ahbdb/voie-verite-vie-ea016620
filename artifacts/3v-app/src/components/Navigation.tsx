import { useState, useEffect, Component } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import {
  Menu,
  Cross,
  BookOpen,
  Calendar,
  Mail,
  Camera,
  HelpCircle,
  User,
  LogOut,
  Bot,
  Heart,
  Shield,
  Download,
  ChevronDown,
  Settings,
  Sun,
  Moon,
  ZoomIn,
  ZoomOut,
  Radio,
  FileText,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useAdmin } from '@/hooks/useAdmin';
import { useSettings, type TextSize } from '@/hooks/useSettings';
import siteLinks from '@/data/site-links';
import { useToast } from '@/components/ui/use-toast';
import { NotificationBell } from './NotificationBell';
import LanguageSelector from './LanguageSelector';
import AnimatedLogo from './AnimatedLogo';
import { Bell } from 'lucide-react';

class NotificationBellBoundary extends Component<
  { children: React.ReactNode },
  { failed: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { failed: false };
  }
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() {}
  render() {
    if (this.state.failed) return <Bell className="w-5 h-5 text-muted-foreground opacity-50" />;
    return this.props.children;
  }
}

const ICONS: Record<string, any> = {
  Cross,
  BookOpen,
  User,
  Calendar,
  Heart,
  Camera,
  HelpCircle,
  Mail,
  Download,
  Bot,
  Settings,
  Radio,
  FileText,
};

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const Navigation = () => {
  const { t } = useTranslation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const { user, signOut, loading: authLoading } = useAuth();
  const { isAdmin } = useAdmin();
  const { settings, setTheme, setTextSize, isDarkMode } = useSettings();
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;
  const { toast } = useToast();

  const textSizes: TextSize[] = ['small', 'normal', 'large', 'extra-large'];
  const currentSizeIndex = textSizes.indexOf(settings.textSize);
  const canZoomIn = currentSizeIndex < textSizes.length - 1;
  const canZoomOut = currentSizeIndex > 0;

  const handleZoomIn = () => {
    if (canZoomIn) setTextSize(textSizes[currentSizeIndex + 1]);
  };

  const handleZoomOut = () => {
    if (canZoomOut) setTextSize(textSizes[currentSizeIndex - 1]);
  };

  const isPathActive = (href: string) => {
    if (href === '/') return currentPath === '/';
    return currentPath === href || currentPath.startsWith(href + '/');
  };

  useEffect(() => {
    if (!isMenuOpen) return;
    const activeCat = siteLinks.find((cat) =>
      cat.items
        .filter((i) => i.showInNav !== false)
        .some((item) => isPathActive(item.href))
    );
    if (activeCat) setExpandedCategory(activeCat.id);
  }, [isMenuOpen, currentPath]);

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      navigate('/install');
      return;
    }

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstallable(false);
    }
    setDeferredPrompt(null);
  };

  const handleSignOut = async () => {
    await signOut();
    toast({
      title: t('auth.logoutSuccess'),
      description: t('auth.logoutMessage'),
    });
    navigate('/');
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border/50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center space-x-3">
            <AnimatedLogo size="sm" />
            <span className="font-cinzel font-semibold text-foreground hidden sm:inline whitespace-nowrap" style={{ fontSize: 'clamp(0.75rem, 1.5vw, 1.25rem)' }}>
              {t('brand.fullName')}
            </span>
          </Link>

          <div className="hidden lg:flex items-center gap-2">
            {siteLinks.map((category) => {
              const visibleItems = category.items.filter((i) => i.showInNav !== false);
              const categoryIsActive = visibleItems.some((item) => isPathActive(item.href));

              return (
                <div key={category.id} className="group relative">
                  <button
                    className={
                      'inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors duration-150 rounded-full border ' +
                      (categoryIsActive
                        ? 'text-primary border-primary/40 bg-primary/10'
                        : 'text-muted-foreground border-transparent hover:text-primary hover:border-border hover:bg-muted/40')
                    }
                    aria-current={categoryIsActive ? 'page' : undefined}
                  >
                    {t(category.titleKey)}
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>

                  <div className="absolute left-0 mt-2 w-64 bg-popover text-popover-foreground border border-border rounded-xl shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 ease-out origin-top-left z-50">
                    <div className="py-2">
                      {visibleItems.map((item) => {
                        const Icon = item.icon ? ICONS[item.icon as string] : undefined;
                        const active = isPathActive(item.href);

                        return (
                          <Link
                            key={item.nameKey}
                            to={item.href}
                            className={
                              'mx-2 flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors duration-150 ' +
                              (active ? 'bg-muted text-primary font-semibold' : 'hover:bg-muted/50')
                            }
                            aria-current={active ? 'page' : undefined}
                          >
                            {Icon && <Icon className="w-4 h-4 flex-shrink-0" />}
                            <span>{t(item.nameKey)}</span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="hidden lg:flex items-center gap-2">
            <NotificationBellBoundary><NotificationBell /></NotificationBellBoundary>
            <LanguageSelector variant="icon" />

            <Button
              onClick={() => setTheme(isDarkMode ? 'light' : 'dark')}
              variant="ghost"
              size="sm"
              className="gap-2"
              title={isDarkMode ? t('common.lightMode') : t('common.darkMode')}
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-primary" /> : <Moon className="w-4 h-4 text-muted-foreground" />}
            </Button>

            <div className="flex items-center gap-0.5">
              <Button onClick={handleZoomOut} variant="ghost" size="sm" disabled={!canZoomOut} title={t('common.reduceText')}>
                <ZoomOut className="w-4 h-4" />
              </Button>
              <Button onClick={handleZoomIn} variant="ghost" size="sm" disabled={!canZoomIn} title={t('common.enlargeText')}>
                <ZoomIn className="w-4 h-4" />
              </Button>
            </div>

            <Button onClick={handleInstall} variant="ghost" size="sm" className="gap-2 text-secondary">
              <Download className="w-4 h-4" />
              {isInstallable ? t('common.install') : t('common.installApp')}
            </Button>

            {authLoading ? (
              <div className="w-12" />
            ) : user ? (
              <>
                {isAdmin && (
                  <Button onClick={() => navigate('/admin')} variant="ghost" size="sm" className="gap-2 text-primary">
                    <Shield className="w-4 h-4" />
                    {t('common.admin')}
                  </Button>
                )}
                <Button onClick={handleSignOut} variant="outline" size="sm" className="gap-2">
                  <LogOut className="w-4 h-4" />
                  {t('common.logout')}
                </Button>
              </>
            ) : (
              <>
                <Button onClick={() => navigate('/auth')} variant="ghost" size="sm">
                  <User className="w-4 h-4 mr-2" />
                  {t('common.login')}
                </Button>
                <Button onClick={() => navigate('/auth')} variant="default" size="sm" className="divine-glow">
                  {t('common.joinUs')}
                </Button>
              </>
            )}
          </div>

          <div className="flex items-center gap-0.5 lg:hidden">
            <LanguageSelector variant="icon" />
            <NotificationBellBoundary><NotificationBell /></NotificationBellBoundary>

            <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>

              <SheetContent side="right" className="w-[30%] min-w-[250px] sm:w-[30%]">
                <div className="flex flex-col h-full py-6">
                  <div className="space-y-4 flex-1 overflow-y-auto">
                    {siteLinks.map((cat) => {
                      const visibleItems = cat.items.filter((i) => i.showInNav !== false);
                      const isExpanded = expandedCategory === cat.id;
                      const catIsActive = visibleItems.some((item) => isPathActive(item.href));

                      return (
                        <div key={cat.id} className="rounded-xl border border-border/60 bg-card p-3">
                          <button
                            onClick={() => setExpandedCategory(isExpanded ? null : cat.id)}
                            aria-expanded={isExpanded}
                            className={
                              'w-full flex items-center px-0 py-1 text-xs font-bold uppercase tracking-wider transition-opacity text-left ' +
                              (catIsActive ? 'text-primary' : 'text-muted-foreground hover:opacity-80')
                            }
                          >
                            <span>{t(cat.titleKey)}</span>
                            <ChevronDown
                              className={`w-4 h-4 transition-transform duration-200 ml-auto flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`}
                            />
                          </button>

                          {isExpanded && (
                            <div className="space-y-1 mt-2 pt-2 border-t border-border/60">
                              {visibleItems.map((item) => {
                                const Icon = item.icon ? ICONS[item.icon as string] : undefined;
                                const active = isPathActive(item.href);

                                return (
                                  <Link
                                    key={item.nameKey}
                                    to={item.href}
                                    className={
                                      'flex items-center space-x-3 py-2 px-2 rounded-lg transition-colors ' +
                                      (active ? 'bg-muted text-primary font-semibold' : 'hover:bg-muted/60')
                                    }
                                    aria-current={active ? 'page' : undefined}
                                    onClick={() => setIsMenuOpen(false)}
                                  >
                                    {Icon && <Icon className="w-4 h-4 text-primary flex-shrink-0" />}
                                    <span className="text-sm">{t(item.nameKey)}</span>
                                  </Link>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="border-t border-border/50 pt-4 space-y-2">
                    <div className="flex items-center justify-between px-2 pb-2">
                      <div className="flex items-center gap-1">
                        <Button onClick={handleZoomOut} variant="ghost" size="icon" className="h-8 w-8" disabled={!canZoomOut} title={t('common.reduceText')}>
                          <ZoomOut className="w-4 h-4" />
                        </Button>
                        <Button onClick={handleZoomIn} variant="ghost" size="icon" className="h-8 w-8" disabled={!canZoomIn} title={t('common.enlargeText')}>
                          <ZoomIn className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          onClick={() => setTheme(isDarkMode ? 'light' : 'dark')}
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title={isDarkMode ? t('common.lightMode') : t('common.darkMode')}
                        >
                          {isDarkMode ? <Sun className="w-4 h-4 text-primary" /> : <Moon className="w-4 h-4 text-muted-foreground" />}
                        </Button>
                        <LanguageSelector variant="icon" />
                      </div>
                    </div>

                    <Button
                      onClick={() => {
                        handleInstall();
                        setIsMenuOpen(false);
                      }}
                      variant="ghost"
                      className="w-full justify-start text-secondary"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      {t('common.installApp')}
                    </Button>

                    {user ? (
                      <>
                        {isAdmin && (
                          <Button
                            onClick={() => {
                              navigate('/admin');
                              setIsMenuOpen(false);
                            }}
                            variant="ghost"
                            className="w-full justify-start text-primary"
                          >
                            <Shield className="w-4 h-4 mr-2" />
                            {t('common.admin')}
                          </Button>
                        )}
                        <Button
                          onClick={() => {
                            handleSignOut();
                            setIsMenuOpen(false);
                          }}
                          variant="outline"
                          className="w-full justify-start"
                        >
                          <LogOut className="w-4 h-4 mr-2" />
                          {t('common.logout')}
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          onClick={() => {
                            navigate('/auth');
                            setIsMenuOpen(false);
                          }}
                          variant="ghost"
                          className="w-full justify-start"
                        >
                          <User className="w-4 h-4 mr-2" />
                          {t('common.login')}
                        </Button>
                        <Button
                          onClick={() => {
                            navigate('/auth');
                            setIsMenuOpen(false);
                          }}
                          variant="default"
                          className="w-full divine-glow"
                        >
                          {t('common.joinUs')}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
