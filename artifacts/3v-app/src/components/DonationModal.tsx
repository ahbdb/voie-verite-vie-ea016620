import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Heart, CreditCard, Smartphone } from 'lucide-react';

const WHATSAPP_NUMBER = '+393513430349';

interface DonationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DonationModal = ({ open, onOpenChange }: DonationModalProps) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [amount, setAmount] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!amount || parseInt(amount) <= 0) {
      toast({ title: t('donation.invalidAmount'), description: t('donation.invalidAmountDesc'), variant: 'destructive' });
      return;
    }
    if (!name.trim()) {
      toast({ title: t('donation.nameRequired'), description: t('donation.nameRequiredDesc'), variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from('donations').insert({
        amount: parseInt(amount), donor_name: name.trim(), donor_email: email.trim() || null,
        message: message.trim() || null, user_id: user?.id || null, currency: 'XAF', status: 'pending'
      });
      if (error) throw error;

      const donationMessage = encodeURIComponent(
        `Bonjour! Je souhaite faire un don de ${parseInt(amount).toLocaleString('fr-FR')} FCFA à l'association Voie, Vérité, Vie (3V).\n\nNom: ${name}\n${email ? `Email: ${email}\n` : ''}${message ? `Message: ${message}` : ''}`
      );
      window.open(`https://wa.me/${WHATSAPP_NUMBER.replace(/\+/g, '')}?text=${donationMessage}`, '_blank');

      toast({ title: t('donation.donationSaved'), description: t('donation.donationSavedDesc') });
      setAmount(''); setName(''); setEmail(''); setMessage('');
      onOpenChange(false);
    } catch (error) {
      console.error('Error submitting donation:', error);
      toast({ title: t('common.error'), description: t('donation.donationError'), variant: 'destructive' });
    } finally { setSubmitting(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary"><Heart className="w-5 h-5" />{t('donation.title')}</DialogTitle>
          <DialogDescription>{t('donation.subtitle')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="amount">{t('donation.amount')}</Label>
            <Input id="amount" type="number" min="1" placeholder={t('donation.amountPlaceholder')} value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="name">{t('donation.yourName')}</Label>
            <Input id="name" placeholder={t('donation.yourNamePlaceholder')} value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="email">{t('donation.emailOptional')}</Label>
            <Input id="email" type="email" placeholder="votre@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="message">{t('donation.messageOptional')}</Label>
            <Textarea id="message" placeholder={t('donation.messagePlaceholder')} value={message} onChange={(e) => setMessage(e.target.value)} rows={2} />
          </div>

          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <p className="text-sm font-medium">{t('donation.paymentMethods')}</p>
            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><Smartphone className="w-4 h-4" /> Mobile Money</span>
              <span className="flex items-center gap-1"><CreditCard className="w-4 h-4" /> Orange Money</span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">{t('donation.whatsappRedirect')}</p>
          </div>

          <Button onClick={handleSubmit} disabled={submitting} className="w-full">
            {submitting ? (
              <span className="flex items-center gap-2"><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />{t('donation.sending')}</span>
            ) : (
              <span className="flex items-center gap-2"><Heart className="w-4 h-4" />{t('donation.sendBtn')}</span>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DonationModal;
