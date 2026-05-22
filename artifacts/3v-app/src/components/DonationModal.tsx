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
  title: 'Fondateur-Modérateur de VOIE VERITE VIE',
};

const WHATSAPP_NUMBER = '+393513430349';

// ─── Generates EPC/GiroCode QR payload (SEPA standard) ──────────────────────
// When scanned by a banking app, all fields are pre-filled automatically.
function buildEpcPayload(reference = 'Don - 3V') {
  return [
    'BCD',          // Service Tag
    '002',          // Version
    '1',            // Character set: UTF-8
    'SCT',          // SEPA Credit Transfer
    REVOLUT_INFO.bic,
    REVOLUT_INFO.beneficiary,
    REVOLUT_INFO.ibanRaw,
    '',             // Amount (empty = user fills in their app)
    '',             // Purpose code (empty)
    '',             // Structured remittance (empty)
    reference,      // Unstructured remittance info
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
      toast({ title: '✅ Copié !', description: `${field} copié.` });
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
        onClick={() => copy(value, label)}
        className="flex-shrink-0 p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
        title="Copier"
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
            {t('donation.title', 'Soutenir l\'Association 3V')}
          </DialogTitle>
          <DialogDescription>
            {t('donation.subtitle', 'Votre soutien permet à l\'association Voie, Vérité, Vie de poursuivre sa mission spirituelle.')}
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
                <p className="font-semibold text-foreground text-base">Virer via mon appli bancaire</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Scannez le QR code avec votre application bancaire — toutes les coordonnées sont pré-remplies, il ne reste qu'à entrer le montant.
                </p>
              </div>
            </button>
          ) : (
            /* ── QR code EPC affiché ─────────────────────────────────── */
            <div className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center justify-between w-full">
                <p className="font-semibold text-foreground">QR code de virement</p>
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
                  📱 Comment scanner ?
                </p>
                <ol className="text-xs text-amber-700 dark:text-amber-400 space-y-1 list-decimal list-inside">
                  <li>Ouvrez votre application bancaire</li>
                  <li>Cherchez « Virement » ou « Scanner un QR »</li>
                  <li>Scannez ce code — les coordonnées s'affichent</li>
                  <li>Entrez le montant et confirmez</li>
                </ol>
              </div>

              <p className="text-xs text-center text-muted-foreground">
                Compatible avec la majorité des applications bancaires européennes (SEPA).
              </p>
            </div>
          )}

          {/* ── Séparateur ──────────────────────────────────────────── */}
          <div className="relative flex items-center">
            <div className="flex-1 border-t border-border" />
            <span className="px-3 text-xs text-muted-foreground">ou virement manuel</span>
            <div className="flex-1 border-t border-border" />
          </div>

          {/* ── Coordonnées bancaires copiables ─────────────────────── */}
          <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-1">
            <div className="flex items-center gap-2 mb-3">
              <Building2 className="w-4 h-4 text-primary" />
              <p className="text-sm font-semibold text-foreground">Coordonnées bancaires — Revolut</p>
            </div>
            <CopyRow label="Bénéficiaire"  value={REVOLUT_INFO.beneficiary} field="Bénéficiaire" />
            <CopyRow label="IBAN"          value={REVOLUT_INFO.iban}        field="IBAN" />
            <CopyRow label="BIC / SWIFT"   value={REVOLUT_INFO.bic}         field="BIC / SWIFT" />
            <CopyRow label="Banque"        value={REVOLUT_INFO.bank}        field="Banque" />
            <div className="pt-2">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-0.5">Adresse</p>
              <p className="text-xs text-muted-foreground">{REVOLUT_INFO.address}</p>
            </div>
          </div>

          {/* Communication conseillée */}
          <div className="rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20 p-3">
            <p className="text-xs text-amber-800 dark:text-amber-300 font-medium">
              💡 Communication : <strong>Don — 3V</strong>{user?.name ? ` — ${user.name}` : ''}
            </p>
          </div>

          {/* ── Séparateur ──────────────────────────────────────────── */}
          <div className="relative flex items-center">
            <div className="flex-1 border-t border-border" />
            <span className="px-3 text-xs text-muted-foreground">ou</span>
            <div className="flex-1 border-t border-border" />
          </div>

          {/* ── Mobile Money WhatsApp ────────────────────────────────── */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-green-600" />
              <p className="text-sm font-semibold text-foreground">Mobile Money / WhatsApp</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Pour un don par Orange Money, MTN ou tout autre Mobile Money.
            </p>
            <Button variant="outline" onClick={openWhatsApp}
              className="w-full gap-2 border-green-500 text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20">
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
