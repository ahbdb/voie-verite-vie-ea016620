import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import Navigation from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Heart, Check, Building2, Phone, QrCode, Copy, X as XIcon } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast as sonnerToast } from 'sonner';
import { QRCodeSVG } from 'qrcode.react';

const db = supabase as any;

// ── Payment info (mirrors DonationModal.tsx) ────────────────────────────────

const REVOLUT_INFO = {
  bank: 'Revolut Bank UAB',
  address: 'Via Dante 7, 20123, Milano (ML), Italy',
  bic: 'REVOITM2',
  iban: 'IT94 O036 6901 6009 7214 2622 259',
  ibanRaw: 'IT94O0366901600972142622259',
  beneficiary: 'DYLANNE BAUDOUIN AHOUFACK',
  title: 'Fondateur-Modérateur du Mouvement VOIE VERITE VIE',
};

const WHATSAPP_NUMBER = '+393513430349';

function buildEpcPayload(ref = 'Don - 3V') {
  return ['BCD', '002', '1', 'SCT', REVOLUT_INFO.bic, REVOLUT_INFO.beneficiary, REVOLUT_INFO.ibanRaw, '', '', '', ref].join('\n');
}

// ── Cause options ───────────────────────────────────────────────────────────

const CAUSES = [
  { id: 'general',        emoji: '🙏', labelKey: 'dons.causes.general',        descKey: 'dons.causes.generalDesc' },
  { id: 'jeunesse',       emoji: '✨', labelKey: 'dons.causes.jeunesse',       descKey: 'dons.causes.jeunesseDesc' },
  { id: 'evangelisation', emoji: '📖', labelKey: 'dons.causes.evangelisation', descKey: 'dons.causes.evangelisationDesc' },
  { id: 'pauvres',        emoji: '🤝', labelKey: 'dons.causes.pauvres',        descKey: 'dons.causes.pauvresDesc' },
];

// ── Component ────────────────────────────────────────────────────────────────

const Dons = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user } = useAuth();

  const [selectedCause, setSelectedCause] = useState('general');
  const [showQr, setShowQr] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [donationRecorded, setDonationRecorded] = useState(false);
  const [recording, setRecording] = useState(false);

  const copy = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      toast({ title: t('donation.copied'), description: t('donation.copiedField', { field }) });
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      toast({ title: t('donation.copyError'), description: t('donation.copyErrorDesc'), variant: 'destructive' });
    }
  };

  const openWhatsApp = () => {
    const causeLabel = t(CAUSES.find((c) => c.id === selectedCause)?.labelKey ?? 'dons.causes.general');
    const base = t('donation.whatsappMsg');
    const msg = encodeURIComponent(`${base}\nCause : ${causeLabel}${user ? `\n${t('donation.yourName').replace(' *', '')} : ${user.user_metadata?.full_name ?? ''}` : ''}`);
    window.open(`https://wa.me/${WHATSAPP_NUMBER.replace(/\+/g, '')}?text=${msg}`, '_blank');
  };

  const recordDonation = async () => {
    setRecording(true);
    const { error } = await db.from('donations').insert({
      amount: 0,
      currency: 'XAF',
      donor_name: user?.user_metadata?.full_name ?? null,
      donor_email: user?.email ?? null,
      user_id: user?.id ?? null,
      message: JSON.stringify({ cause: selectedCause, method: 'iban' }),
      status: 'pending',
    });
    if (error) {
      console.error('donation record error:', error);
    } else {
      setDonationRecorded(true);
      sonnerToast.success('Merci pour votre générosité ! 🙏 Que Dieu vous bénisse abondamment.');
    }
    setRecording(false);
  };

  const CopyRow = ({ label, value, field }: { label: string; value: string; field: string }) => (
    <div className="flex items-start justify-between gap-3 py-2 border-b border-border/50 last:border-0">
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-0.5">{label}</p>
        <p className="text-sm font-medium text-foreground break-all">{value}</p>
      </div>
      <button
        onClick={() => copy(value, label)}
        className="flex-shrink-0 p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
        title={t('donation.copy')}
      >
        {copiedField === field ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{t('dons.title')} — Voie Vérité Vie</title>
        <meta name="description" content={t('dons.subtitle')} />
      </Helmet>
      <Navigation />

      <header className="relative overflow-hidden border-b border-cathedral-gold/20 bg-gradient-cathedral pt-28 pb-12 text-center px-4">
        <div className="absolute inset-0 bg-gradient-stained opacity-50 pointer-events-none" />
        <div className="relative max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-cathedral-gold/40 bg-background/10 backdrop-blur-sm mb-5">
            <Heart className="h-3.5 w-3.5 text-cathedral-gold" />
            <span className="text-xs uppercase tracking-[0.2em] text-cathedral-gold font-medium">{t('dons.badge')}</span>
          </div>
          <h1 className="font-cinzel text-4xl sm:text-5xl font-bold text-white mb-4">{t('dons.title')}</h1>
          <div className="cathedral-line w-24 h-px mx-auto my-4" />
          <p className="text-white/70 text-sm sm:text-base leading-relaxed max-w-lg mx-auto">{t('dons.subtitle')}</p>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 py-10 space-y-6">

        {/* Scripture */}
        <div className="rounded-2xl border border-cathedral-gold/20 bg-cathedral-gold/5 p-5 text-center">
          <p className="font-['Playfair_Display',serif] text-sm italic text-foreground/80">{t('dons.verse')}</p>
          <p className="text-xs text-cathedral-gold font-semibold mt-2">{t('dons.verseRef')}</p>
        </div>

        {/* Cause selector */}
        <div className="space-y-2">
          <h2 className="font-cinzel font-bold text-foreground text-base">{t('dons.causeTitle')}</h2>
          <div className="grid grid-cols-1 gap-2">
            {CAUSES.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedCause(c.id)}
                className={`flex items-center justify-between rounded-xl border p-4 text-left transition-all ${selectedCause === c.id ? 'border-cathedral-gold/60 bg-cathedral-gold/10' : 'border-border/60 bg-card hover:border-border'}`}
              >
                <div>
                  <div className="font-medium text-sm text-foreground">{c.emoji} {t(c.labelKey)}</div>
                  <div className="text-xs text-muted-foreground">{t(c.descKey)}</div>
                </div>
                {selectedCause === c.id && <Check className="h-4 w-4 text-cathedral-gold shrink-0" />}
              </button>
            ))}
          </div>
        </div>

        {/* QR EPC-SEPA */}
        <div className="rounded-2xl border border-primary/30 bg-card p-5 space-y-4">
          {!showQr ? (
            <button
              onClick={() => setShowQr(true)}
              className="w-full flex flex-col items-center gap-3 rounded-2xl border-2 border-primary bg-primary/5 p-5 hover:bg-primary/10 active:scale-[0.98] transition-all"
            >
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                <QrCode className="w-7 h-7 text-primary" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-foreground text-base">{t('donation.qrTitle')}</p>
                <p className="text-xs text-muted-foreground mt-1">{t('donation.qrDesc')}</p>
              </div>
            </button>
          ) : (
            <div className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-muted/30 p-5">
              <div className="flex items-center justify-between w-full">
                <p className="font-semibold text-foreground">{t('donation.qrCodeTitle')}</p>
                <button onClick={() => setShowQr(false)} className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground">
                  <XIcon className="w-4 h-4" />
                </button>
              </div>
              <div className="bg-white p-4 rounded-xl shadow-sm">
                <QRCodeSVG value={buildEpcPayload()} size={220} level="M" includeMargin={false} />
              </div>
              <div className="w-full rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3 space-y-1.5">
                <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">{t('donation.qrHowTitle')}</p>
                <ol className="text-xs text-amber-700 dark:text-amber-400 space-y-1 list-decimal list-inside">
                  <li>{t('donation.qrStep1')}</li>
                  <li>{t('donation.qrStep2')}</li>
                  <li>{t('donation.qrStep3')}</li>
                  <li>{t('donation.qrStep4')}</li>
                </ol>
              </div>
              <p className="text-xs text-center text-muted-foreground">{t('donation.qrCompat')}</p>
            </div>
          )}

          <div className="relative flex items-center">
            <div className="flex-1 border-t border-border" />
            <span className="px-3 text-xs text-muted-foreground">{t('donation.orManualTransfer')}</span>
            <div className="flex-1 border-t border-border" />
          </div>

          {/* Bank details */}
          <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-1">
            <div className="flex items-center gap-2 mb-3">
              <Building2 className="w-4 h-4 text-primary" />
              <p className="text-sm font-semibold text-foreground">{t('donation.bankDetails')}</p>
            </div>
            <div className="flex items-start justify-between gap-3 py-2 border-b border-border/50">
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-0.5">{t('donation.beneficiary')}</p>
                <p className="text-sm font-medium text-foreground">{REVOLUT_INFO.beneficiary}</p>
                <p className="text-xs text-muted-foreground italic">{REVOLUT_INFO.title}</p>
              </div>
              <button
                onClick={() => copy(REVOLUT_INFO.beneficiary, t('donation.beneficiary'))}
                className="flex-shrink-0 p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                title={t('donation.copy')}
              >
                {copiedField === t('donation.beneficiary') ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
            <CopyRow label="IBAN"        value={REVOLUT_INFO.iban} field="IBAN" />
            <CopyRow label="BIC / SWIFT" value={REVOLUT_INFO.bic}  field="BIC / SWIFT" />
            <CopyRow label={t('donation.bank')} value={REVOLUT_INFO.bank} field="bank" />
            <div className="pt-2">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-0.5">{t('donation.address')}</p>
              <p className="text-xs text-muted-foreground">{REVOLUT_INFO.address}</p>
            </div>
          </div>

          {/* Communication */}
          <div className="rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20 p-3">
            <p className="text-xs text-amber-800 dark:text-amber-300 font-medium">
              {t('donation.communication')}{user?.user_metadata?.full_name ? ` — ${user.user_metadata.full_name}` : ''}
            </p>
          </div>

          <div className="relative flex items-center">
            <div className="flex-1 border-t border-border" />
            <span className="px-3 text-xs text-muted-foreground">{t('donation.or')}</span>
            <div className="flex-1 border-t border-border" />
          </div>

          {/* Mobile Money via WhatsApp */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-green-600" />
              <p className="text-sm font-semibold text-foreground">{t('donation.mobileMoney')}</p>
            </div>
            <p className="text-xs text-muted-foreground">{t('donation.mobileMoneyDesc')}</p>
            <Button
              variant="outline"
              onClick={openWhatsApp}
              className="w-full gap-2 border-green-500 text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20"
            >
              <Phone className="w-4 h-4" />
              {t('donation.whatsappBtn')}
            </Button>
          </div>

          {/* "I donated" button */}
          <div className="pt-1">
            {donationRecorded ? (
              <div className="flex items-center justify-center gap-2 text-emerald-600 text-sm font-medium py-3">
                <Check className="h-4 w-4" /> Don enregistré — Merci ! 🙏
              </div>
            ) : (
              <Button
                onClick={recordDonation}
                disabled={recording}
                className="w-full bg-cathedral-gold hover:bg-cathedral-gold/90 text-black font-bold rounded-xl"
              >
                <Heart className="h-4 w-4 mr-2" />
                {recording ? 'Enregistrement...' : 'J\'ai fait mon don'}
              </Button>
            )}
          </div>

          <p className="text-center text-xs text-muted-foreground pt-1">{t('donation.thanks')}</p>
        </div>

        {/* Closing verse */}
        <div className="rounded-2xl border border-cathedral-gold/20 bg-cathedral-gold/5 p-5 text-center">
          <p className="font-['Playfair_Display',serif] text-sm italic text-foreground/80">{t('dons.verse2')}</p>
          <p className="text-xs text-cathedral-gold font-semibold mt-2">{t('dons.verseRef2')}</p>
        </div>
      </main>
    </div>
  );
};

export default Dons;
