import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import Navigation from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Heart, Check, Phone, Copy } from 'lucide-react';
import { toast } from 'sonner';

interface PaymentMethod {
  id: string;
  name: string;
  logo: string;
  number: string;
  color: string;
  bgClass: string;
  borderClass: string;
  instruction: string;
}

const PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: 'orange',
    name: 'Orange Money',
    logo: '🟠',
    number: '+237 6XX XXX XXX',
    color: 'text-orange-600',
    bgClass: 'bg-orange-500/10',
    borderClass: 'border-orange-500/40',
    instruction: 'Composez #150# → Paiement → Entrez le numéro et le montant',
  },
  {
    id: 'mtn',
    name: 'MTN MoMo',
    logo: '🟡',
    number: '+237 6XX XXX XXX',
    color: 'text-yellow-600',
    bgClass: 'bg-yellow-500/10',
    borderClass: 'border-yellow-500/40',
    instruction: 'Composez *126# → Payer un service → Entrez le numéro et le montant',
  },
  {
    id: 'moov',
    name: 'Moov Money',
    logo: '🔵',
    number: '+237 6XX XXX XXX',
    color: 'text-blue-600',
    bgClass: 'bg-blue-500/10',
    borderClass: 'border-blue-500/40',
    instruction: 'Composez *555# → Transfert → Entrez le numéro et le montant',
  },
];

const PRESET_AMOUNTS = [500, 1000, 2000, 5000, 10000, 20000];

const CAUSES = [
  { id: 'general', label: '🙏 Soutien général', description: 'Pour le fonctionnement de la communauté 3V' },
  { id: 'jeunesse', label: '✨ Jeunesse & Formation', description: 'Activités et retraites pour les jeunes' },
  { id: 'evangelisation', label: '📖 Évangélisation', description: 'Missions et outreach' },
  { id: 'pauvres', label: '🤝 Aide aux pauvres', description: 'Solidarité avec les plus démunis' },
];

const Dons = () => {
  const [selectedMethod, setSelectedMethod] = useState<string>('orange');
  const [selectedAmount, setSelectedAmount] = useState<number | null>(1000);
  const [customAmount, setCustomAmount] = useState('');
  const [selectedCause, setSelectedCause] = useState('general');
  const [step, setStep] = useState<'choose' | 'confirm'>('choose');

  const method = PAYMENT_METHODS.find((m) => m.id === selectedMethod)!;
  const finalAmount = customAmount ? parseInt(customAmount, 10) : selectedAmount;

  const handleConfirm = () => {
    if (!finalAmount || finalAmount < 100) {
      toast.error('Montant minimum : 100 FCFA');
      return;
    }
    setStep('confirm');
  };

  const copyNumber = async () => {
    await navigator.clipboard.writeText(method.number);
    toast.success('Numéro copié !');
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Dons & Offrandes — Voie Vérité Vie</title>
        <meta name="description" content="Soutenez la mission de la communauté 3V par un don via Mobile Money ou virement." />
      </Helmet>
      <Navigation />

      <header className="relative overflow-hidden border-b border-cathedral-gold/20 bg-gradient-cathedral pt-28 pb-12 text-center px-4">
        <div className="absolute inset-0 bg-gradient-stained opacity-50 pointer-events-none" />
        <div className="relative max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-cathedral-gold/40 bg-background/10 backdrop-blur-sm mb-5">
            <Heart className="h-3.5 w-3.5 text-cathedral-gold" />
            <span className="text-xs uppercase tracking-[0.2em] text-cathedral-gold font-medium">Soutenir la mission</span>
          </div>
          <h1 className="font-cinzel text-4xl sm:text-5xl font-bold text-white mb-4">Dons & Offrandes</h1>
          <div className="cathedral-line w-24 h-px mx-auto my-4" />
          <p className="text-white/70 text-sm sm:text-base leading-relaxed max-w-lg mx-auto">
            Votre générosité permet à la communauté 3V de grandir et d'évangéliser. Chaque don, grand ou petit, est une semence de vie.
          </p>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 py-10 space-y-6">
        {step === 'choose' ? (
          <>
            {/* Scripture */}
            <div className="rounded-2xl border border-cathedral-gold/20 bg-cathedral-gold/5 p-5 text-center">
              <p className="font-['Playfair_Display',serif] text-sm italic text-foreground/80">
                « Que chacun donne selon ce qu'il a décidé dans son cœur, sans tristesse ni contrainte, car Dieu aime celui qui donne avec joie. »
              </p>
              <p className="text-xs text-cathedral-gold font-semibold mt-2">2 Corinthiens 9, 7</p>
            </div>

            {/* Cause */}
            <div className="space-y-2">
              <h2 className="font-cinzel font-bold text-foreground text-base">Pour quelle cause ?</h2>
              <div className="grid grid-cols-1 gap-2">
                {CAUSES.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCause(c.id)}
                    className={`flex items-center justify-between rounded-xl border p-4 text-left transition-all ${selectedCause === c.id ? 'border-cathedral-gold/60 bg-cathedral-gold/10' : 'border-border/60 bg-card hover:border-border'}`}
                  >
                    <div>
                      <div className="font-medium text-sm text-foreground">{c.label}</div>
                      <div className="text-xs text-muted-foreground">{c.description}</div>
                    </div>
                    {selectedCause === c.id && <Check className="h-4 w-4 text-cathedral-gold shrink-0" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Amount */}
            <div className="space-y-3">
              <h2 className="font-cinzel font-bold text-foreground text-base">Montant (FCFA)</h2>
              <div className="grid grid-cols-3 gap-2">
                {PRESET_AMOUNTS.map((a) => (
                  <button
                    key={a}
                    onClick={() => { setSelectedAmount(a); setCustomAmount(''); }}
                    className={`rounded-xl border py-3 text-sm font-bold transition-all ${selectedAmount === a && !customAmount ? 'bg-cathedral-gold/20 border-cathedral-gold/60 text-cathedral-gold' : 'border-border/60 bg-card text-foreground hover:border-border'}`}
                  >
                    {a.toLocaleString('fr-FR')}
                  </button>
                ))}
              </div>
              <div className="relative">
                <Input
                  type="number"
                  placeholder="Autre montant..."
                  value={customAmount}
                  onChange={(e) => { setCustomAmount(e.target.value); setSelectedAmount(null); }}
                  className="rounded-xl pr-16"
                  min={100}
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-bold">FCFA</span>
              </div>
            </div>

            {/* Payment method */}
            <div className="space-y-3">
              <h2 className="font-cinzel font-bold text-foreground text-base">Méthode de paiement</h2>
              <div className="space-y-2">
                {PAYMENT_METHODS.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setSelectedMethod(m.id)}
                    className={`w-full flex items-center gap-3 rounded-xl border p-4 text-left transition-all ${selectedMethod === m.id ? `${m.bgClass} ${m.borderClass}` : 'border-border/60 bg-card hover:border-border'}`}
                  >
                    <span className="text-2xl">{m.logo}</span>
                    <div className="flex-1">
                      <div className={`font-bold text-sm ${selectedMethod === m.id ? m.color : 'text-foreground'}`}>{m.name}</div>
                      <div className="text-xs text-muted-foreground">{m.instruction}</div>
                    </div>
                    {selectedMethod === m.id && <Check className={`h-4 w-4 ${m.color} shrink-0`} />}
                  </button>
                ))}
              </div>
            </div>

            <Button
              onClick={handleConfirm}
              className="w-full bg-cathedral-gold hover:bg-cathedral-gold/90 text-black font-bold rounded-xl py-5 text-base"
            >
              <Heart className="h-4 w-4 mr-2" />
              Continuer — {finalAmount ? `${finalAmount.toLocaleString('fr-FR')} FCFA` : 'choisir un montant'}
            </Button>
          </>
        ) : (
          <>
            {/* Confirmation screen */}
            <div className="rounded-2xl border border-cathedral-gold/30 bg-card p-6 space-y-5">
              <div className="text-center space-y-2">
                <div className="text-4xl">{method.logo}</div>
                <h2 className="font-cinzel text-xl font-bold text-foreground">Instructions de paiement</h2>
                <Badge variant="outline" className="rounded-full text-cathedral-gold border-cathedral-gold/40">
                  {finalAmount?.toLocaleString('fr-FR')} FCFA via {method.name}
                </Badge>
              </div>

              <div className={`rounded-xl ${method.bgClass} ${method.borderClass} border p-4 space-y-3`}>
                <div className="text-sm font-medium text-foreground">Numéro de réception :</div>
                <div className="flex items-center justify-between gap-3 bg-background rounded-lg px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Phone className={`h-4 w-4 ${method.color}`} />
                    <span className="font-mono font-bold text-foreground">{method.number}</span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={copyNumber} className="gap-1.5 text-xs">
                    <Copy className="h-3.5 w-3.5" /> Copier
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">{method.instruction}</p>
              </div>

              <div className="rounded-xl bg-muted/40 p-4 space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cause :</span>
                  <span className="font-medium text-foreground">{CAUSES.find((c) => c.id === selectedCause)?.label}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Montant :</span>
                  <span className="font-bold text-foreground">{finalAmount?.toLocaleString('fr-FR')} FCFA</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Méthode :</span>
                  <span className="font-medium text-foreground">{method.name}</span>
                </div>
              </div>

              <p className="text-xs text-muted-foreground text-center leading-relaxed">
                Après le paiement, envoyez votre reçu par WhatsApp ou email pour confirmation.
                Que Dieu vous bénisse pour votre générosité. 🙏
              </p>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep('choose')} className="flex-1 rounded-xl">
                  Modifier
                </Button>
                <Button
                  onClick={() => { toast.success('Merci pour votre don ! Que Dieu vous bénisse. 🙏'); setStep('choose'); }}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl"
                >
                  <Check className="h-4 w-4 mr-2" /> J'ai payé
                </Button>
              </div>
            </div>

            {/* Blessing */}
            <div className="rounded-2xl border border-cathedral-gold/20 bg-cathedral-gold/5 p-5 text-center">
              <p className="font-['Playfair_Display',serif] text-sm italic text-foreground/80">
                « Celui qui sème chichement moissonnera aussi chichement ; celui qui sème abondamment moissonnera aussi abondamment. »
              </p>
              <p className="text-xs text-cathedral-gold font-semibold mt-2">2 Corinthiens 9, 6</p>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default Dons;
