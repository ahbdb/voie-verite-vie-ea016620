import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Heart, Copy, Check, Building2, Phone, QrCode, X } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

interface DonationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

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

function buildEpcPayload(reference = 'Don - 3V') {
  return [
    'BCD',
    '002',
    '1',
    'SCT',
    REVOLUT_INFO.bic,
    REVOLUT_INFO.beneficiary,
    REVOLUT_INFO.ibanRaw,
    '',
    '',
    '',
    reference,
  ].join('\n');
}

const DonationModal = ({ open, onOpenChange }: DonationModalProps) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [showQr, setShowQr] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copy = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      toast({
        title: t('donation.copied'),
        description: t('donation.copiedField', { field }),
      });
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      toast({
        title: t('donation.copyError'),
        description: t('donation.copyErrorDesc'),
        variant: 'destructive',
      });
    }
  };

  const openWhatsApp = () => {
    const base = t('donation.whatsappMsg');
    const msg = encodeURIComponent(`${base}${user?.name ? `\n${t('donation.yourName').replace(' *', '')} : ${user.name}` : ''}`);
    window.open(`https://wa.me/${WHATSAPP_NUMBER.replace(/\+/g, '')}?text=${msg}`, '_blank');
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary">
            <Heart className="w-5 h-5" />
            {t('donation.title')}
          </DialogTitle>
          <DialogDescription>
            {t('donation.subtitle')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">

          {/* ── Bouton QR principal ─────────────────────────────────── */}
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
            <div className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center justify-between w-full">
                <p className="font-semibold text-foreground">{t('donation.qrCodeTitle')}</p>
                <button onClick={() => setShowQr(false)} className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="bg-white p-4 rounded-xl shadow-sm">
                <QRCodeSVG
                  value={buildEpcPayload()}
                  size={220}
                  level="M"
                  includeMargin={false}
                />
              </div>

              <div className="w-full rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3 space-y-1.5">
                <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                  {t('donation.qrHowTitle')}
                </p>
                <ol className="text-xs text-amber-700 dark:text-amber-400 space-y-1 list-decimal list-inside">
                  <li>{t('donation.qrStep1')}</li>
                  <li>{t('donation.qrStep2')}</li>
                  <li>{t('donation.qrStep3')}</li>
                  <li>{t('donation.qrStep4')}</li>
                </ol>
              </div>

              <p className="text-xs text-center text-muted-foreground">
                {t('donation.qrCompat')}
              </p>
            </div>
          )}

          {/* ── Séparateur ──────────────────────────────────────────── */}
          <div className="relative flex items-center">
            <div className="flex-1 border-t border-border" />
            <span className="px-3 text-xs text-muted-foreground">{t('donation.orManualTransfer')}</span>
            <div className="flex-1 border-t border-border" />
          </div>

          {/* ── Coordonnées bancaires copiables ─────────────────────── */}
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
            <CopyRow label="IBAN"        value={REVOLUT_INFO.iban}  field="IBAN" />
            <CopyRow label="BIC / SWIFT" value={REVOLUT_INFO.bic}   field="BIC / SWIFT" />
            <CopyRow label={t('donation.bank')} value={REVOLUT_INFO.bank} field="bank" />
            <div className="pt-2">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-0.5">{t('donation.address')}</p>
              <p className="text-xs text-muted-foreground">{REVOLUT_INFO.address}</p>
            </div>
          </div>

          {/* Communication conseillée */}
          <div className="rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20 p-3">
            <p className="text-xs text-amber-800 dark:text-amber-300 font-medium">
              {t('donation.communication')}{user?.name ? ` — ${user.name}` : ''}
            </p>
          </div>

          {/* ── Séparateur ──────────────────────────────────────────── */}
          <div className="relative flex items-center">
            <div className="flex-1 border-t border-border" />
            <span className="px-3 text-xs text-muted-foreground">{t('donation.or')}</span>
            <div className="flex-1 border-t border-border" />
          </div>

          {/* ── Mobile Money WhatsApp ────────────────────────────────── */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-green-600" />
              <p className="text-sm font-semibold text-foreground">{t('donation.mobileMoney')}</p>
            </div>
            <p className="text-xs text-muted-foreground">{t('donation.mobileMoneyDesc')}</p>
            <Button variant="outline" onClick={openWhatsApp}
              className="w-full gap-2 border-green-500 text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20">
              <Phone className="w-4 h-4" />
              {t('donation.whatsappBtn')}
            </Button>
          </div>

          <p className="text-center text-xs text-muted-foreground pt-1">
            {t('donation.thanks')}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DonationModal;
