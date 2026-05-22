import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Heart, Copy, Check, Building2, CreditCard, Phone } from 'lucide-react';

interface DonationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const REVOLUT_INFO = {
  bank: 'Revolut Bank UAB',
  address: 'Via Dante 7, 20123, Milano (ML), Italy',
  bic: 'REVOITM2',
  iban: 'IT94 O036 6901 6009 7214 2622 259',
  beneficiary: 'DYLANNE BAUDOUIN AHOUFACK',
  title: 'Fondateur-Modérateur de VOIE VERITE VIE',
};

const WHATSAPP_NUMBER = '+393513430349';

const DonationModal = ({ open, onOpenChange }: DonationModalProps) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      toast({ title: '✅ Copié !', description: `${field} copié dans le presse-papiers.` });
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de copier.', variant: 'destructive' });
    }
  };

  const openWhatsApp = () => {
    const msg = encodeURIComponent(
      `Bonjour ! Je souhaite faire un don à l'association Voie, Vérité, Vie (3V).${user?.name ? `\nNom : ${user.name}` : ''}`
    );
    window.open(`https://wa.me/${WHATSAPP_NUMBER.replace(/\+/g, '')}?text=${msg}`, '_blank');
  };

  const CopyRow = ({ label, value, field }: { label: string; value: string; field: string }) => (
    <div className="flex items-start justify-between gap-3 py-2 border-b border-border/50 last:border-0">
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-0.5">{label}</p>
        <p className="text-sm font-medium text-foreground break-all">{value}</p>
      </div>
      <button
        onClick={() => copyToClipboard(value, label)}
        className="flex-shrink-0 p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
        title="Copier"
      >
        {copiedField === label ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary">
            <Heart className="w-5 h-5" />
            {t('donation.title', 'Soutenir l\'Association 3V')}
          </DialogTitle>
          <DialogDescription>
            {t('donation.subtitle', 'Votre soutien permet à l\'association Voie, Vérité, Vie de poursuivre sa mission spirituelle.')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Revolut virement bancaire */}
          <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-1">
            <div className="flex items-center gap-2 mb-3">
              <Building2 className="w-4 h-4 text-primary" />
              <p className="text-sm font-semibold text-foreground">Virement bancaire — Revolut</p>
            </div>

            <CopyRow label="Bénéficiaire" value={REVOLUT_INFO.beneficiary} field="Bénéficiaire" />
            <CopyRow label="Banque" value={REVOLUT_INFO.bank} field="Banque" />
            <CopyRow label="IBAN" value={REVOLUT_INFO.iban} field="IBAN" />
            <CopyRow label="BIC / SWIFT" value={REVOLUT_INFO.bic} field="BIC / SWIFT" />

            <div className="pt-2">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-0.5">Adresse de la banque</p>
              <p className="text-xs text-muted-foreground">{REVOLUT_INFO.address}</p>
            </div>
          </div>

          {/* Communication / motif */}
          <div className="rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20 p-3">
            <p className="text-xs text-amber-800 dark:text-amber-300 font-medium">
              💡 Dans la communication du virement, indiquez : <strong>Don — 3V</strong>
              {user?.name ? ` — ${user.name}` : ''}
            </p>
          </div>

          {/* Séparateur */}
          <div className="relative flex items-center">
            <div className="flex-1 border-t border-border" />
            <span className="px-3 text-xs text-muted-foreground">ou</span>
            <div className="flex-1 border-t border-border" />
          </div>

          {/* WhatsApp alternative */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-green-600" />
              <p className="text-sm font-semibold text-foreground">Mobile Money / WhatsApp</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Contactez-nous via WhatsApp pour un don par Mobile Money (Orange Money, MTN…)
            </p>
            <Button variant="outline" onClick={openWhatsApp} className="w-full gap-2 border-green-500 text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20">
              <Phone className="w-4 h-4" />
              Contacter via WhatsApp
            </Button>
          </div>

          <p className="text-center text-xs text-muted-foreground pt-1">
            Merci de votre générosité 🙏 — Que Dieu vous bénisse !
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DonationModal;
