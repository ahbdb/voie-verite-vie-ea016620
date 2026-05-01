import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Navigation from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Smartphone, CheckCircle, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const Install = () => {
  const { t } = useTranslation();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) setIsInstalled(true);
    const handler = (e: Event) => { e.preventDefault(); setDeferredPrompt(e as BeforeInstallPromptEvent); setIsInstallable(true); };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setIsInstalled(true);
    setDeferredPrompt(null);
    setIsInstallable(false);
  };

  const installSteps = [
    { icon: Smartphone, titleKey: 'install.step1Title', descKey: 'install.step1Desc' },
    { icon: Download, titleKey: 'install.step2Title', descKey: 'install.step2Desc' },
    { icon: CheckCircle, titleKey: 'install.step3Title', descKey: 'install.step3Desc' },
  ];

  return (
    <div className="min-h-screen">
      <Navigation />
      <main className="pt-16">
        <section className="py-20 bg-gradient-subtle">
          <div className="container mx-auto px-4">
            <div className="text-center max-w-4xl mx-auto">
              <Download className="w-16 h-16 text-primary mx-auto mb-6" />
              <h1 className="text-4xl md:text-6xl font-playfair font-bold text-primary mb-6">{t('install.title')}</h1>
              <p className="text-xl text-muted-foreground leading-relaxed">{t('install.subtitle')}</p>
            </div>
          </div>
        </section>

        <section className="py-12">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto">
              {isInstalled ? (
                <Card className="bg-muted/30 border-border/50">
                  <CardContent className="pt-6">
                    <div className="flex items-center space-x-4">
                      <CheckCircle className="w-12 h-12 text-primary" />
                      <div>
                        <h3 className="text-xl font-semibold text-foreground">{t('install.installed')}</h3>
                        <p className="text-muted-foreground">{t('install.installedDesc')}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : isInstallable ? (
                <Card className="bg-primary/5 border-primary/20">
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <Smartphone className="w-12 h-12 text-primary mx-auto mb-4" />
                      <h3 className="text-xl font-semibold text-primary mb-4">{t('install.available')}</h3>
                      <Button onClick={handleInstallClick} size="lg" className="divine-glow">
                        <Download className="w-5 h-5 mr-2" />{t('install.installNow')}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="bg-muted/30">
                  <CardContent className="pt-6">
                    <div className="text-center"><p className="text-muted-foreground">{t('install.followInstructions')}</p></div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </section>

        <section className="py-12 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl font-playfair font-bold text-primary text-center mb-12">{t('install.howTo')}</h2>
              <div className="space-y-6">
                {installSteps.map((step, index) => {
                  const Icon = step.icon;
                  return (
                    <Card key={index} className="bg-card/50 backdrop-blur-sm border-border/50">
                      <CardHeader>
                        <div className="flex items-start space-x-4">
                          <div className="bg-gradient-peace rounded-full w-12 h-12 flex items-center justify-center shadow-glow flex-shrink-0"><Icon className="w-6 h-6 text-primary-foreground" /></div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <span className="text-sm font-semibold text-primary bg-primary/10 px-3 py-1 rounded-full">{t('common.step', { defaultValue: 'Étape' })} {index + 1}</span>
                            </div>
                            <CardTitle className="text-xl font-playfair text-primary">{t(step.titleKey)}</CardTitle>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent><p className="text-muted-foreground pl-16">{t(step.descKey)}</p></CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section className="py-12">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl font-playfair font-bold text-primary text-center mb-12">{t('install.why')}</h2>
              <div className="grid md:grid-cols-3 gap-6">
                {[
                  { titleKey: 'install.quickAccess', descKey: 'install.quickAccessDesc' },
                  { titleKey: 'install.offlineMode', descKey: 'install.offlineModeDesc' },
                  { titleKey: 'install.notificationsTitle', descKey: 'install.notificationsDesc' },
                ].map((benefit, index) => (
                  <Card key={index} className="bg-card/50 backdrop-blur-sm border-border/50 text-center">
                    <CardContent className="pt-6">
                      <CheckCircle className="w-10 h-10 text-primary mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-primary mb-2">{t(benefit.titleKey)}</h3>
                      <p className="text-sm text-muted-foreground">{t(benefit.descKey)}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="py-12 bg-gradient-subtle">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="text-2xl md:text-3xl font-playfair font-bold text-primary mb-6">{t('install.readyTitle')}</h2>
              <p className="text-muted-foreground mb-8">{t('install.readyDesc')}</p>
              <Button asChild size="lg" className="divine-glow">
                <Link to="/">{t('common.returnHome')}<ArrowRight className="w-5 h-5 ml-2" /></Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Install;
