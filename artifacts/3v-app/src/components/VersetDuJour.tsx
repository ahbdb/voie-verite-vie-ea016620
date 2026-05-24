import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Share2, BookOpen, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const VERSETS_FR = [
  { ref: 'Jean 14,6', text: 'Je suis le Chemin, la Vérité et la Vie. Nul ne vient au Père que par moi.' },
  { ref: 'Jérémie 29,11', text: 'Car je connais les projets que j\'ai formés pour vous — oracle du Seigneur — projets de paix et non de malheur, pour vous donner un avenir et une espérance.' },
  { ref: 'Philippiens 4,13', text: 'Je puis tout en celui qui me fortifie.' },
  { ref: 'Romains 8,28', text: 'Nous savons en effet que tout concourt au bien de ceux qui aiment Dieu.' },
  { ref: 'Psaume 23,1', text: 'Le Seigneur est mon berger : je ne manque de rien.' },
  { ref: 'Matthieu 11,28', text: 'Venez à moi, vous tous qui peinez sous le poids du fardeau, et moi je vous donnerai le repos.' },
  { ref: 'Josué 1,9', text: 'Sois fort et courageux ! Ne te laisse pas abattre et ne tremble pas, car le Seigneur ton Dieu est avec toi dans toutes tes entreprises.' },
  { ref: 'Isaïe 40,31', text: 'Ceux qui espèrent dans le Seigneur voient leurs forces se renouveler, ils déploient leurs ailes comme des aigles, ils courent sans s\'épuiser, ils marchent sans se fatiguer.' },
  { ref: 'Matthieu 6,33', text: 'Cherchez d\'abord le royaume de Dieu et sa justice, et tout le reste vous sera donné par surcroît.' },
  { ref: 'Jean 3,16', text: 'Car Dieu a tellement aimé le monde qu\'il a donné son Fils unique, afin que quiconque croit en lui ne se perde pas, mais ait la vie éternelle.' },
  { ref: 'Psaume 46,2', text: 'Dieu est pour nous refuge et force, secours dans les détresses toujours à portée.' },
  { ref: 'Proverbes 3,5', text: 'Confie-toi au Seigneur de tout ton cœur, ne t\'appuie pas sur ta propre intelligence.' },
  { ref: 'Romains 15,13', text: 'Que le Dieu de l\'espérance vous donne la plénitude de la joie et de la paix dans la foi, afin que vous abondiez en espérance, par la puissance de l\'Esprit Saint.' },
  { ref: '1 Corinthiens 13,13', text: 'Ce qui demeure, c\'est la foi, l\'espérance et la charité ; mais la plus grande des trois, c\'est la charité.' },
  { ref: 'Luc 1,37', text: 'Car rien n\'est impossible à Dieu.' },
  { ref: 'Jean 15,5', text: 'Je suis la vigne, et vous les sarments. Celui qui demeure en moi et en qui je demeure, celui-là porte beaucoup de fruit.' },
  { ref: 'Hébreux 11,1', text: 'La foi est la garantie des biens que l\'on espère, la preuve des réalités qu\'on ne voit pas.' },
  { ref: 'Matthieu 5,8', text: 'Heureux les cœurs purs, car ils verront Dieu.' },
  { ref: 'Psaume 118,24', text: 'Voici le jour que fit le Seigneur, qu\'il soit pour nous jour de fête et de joie !' },
  { ref: 'Galates 5,22', text: 'Le fruit de l\'Esprit, c\'est l\'amour, la joie, la paix, la patience, la bonté, la bienveillance, la fidélité, la douceur et la maîtrise de soi.' },
  { ref: 'Colossiens 3,17', text: 'Tout ce que vous dites, tout ce que vous faites, que ce soit toujours au nom du Seigneur Jésus, en offrant par lui votre action de grâce à Dieu le Père.' },
  { ref: 'Psaume 121,2', text: 'Mon secours vient du Seigneur, qui a fait le ciel et la terre.' },
  { ref: 'Isaïe 41,10', text: 'Ne crains pas, car je suis avec toi ; ne te décourage pas, car je suis ton Dieu. Je te fortifie, je viens à ton aide, je te soutiens de ma main droite victorieuse.' },
  { ref: 'Jean 16,33', text: 'Dans le monde vous aurez à souffrir, mais courage ! Moi, j\'ai vaincu le monde.' },
  { ref: 'Matthieu 7,7', text: 'Demandez et l\'on vous donnera ; cherchez et vous trouverez ; frappez et l\'on vous ouvrira.' },
  { ref: 'Apocalypse 3,20', text: 'Voici que je me tiens à la porte et je frappe. Si quelqu\'un entend ma voix et ouvre la porte, j\'entrerai chez lui.' },
  { ref: 'Jacques 1,17', text: 'Tout don excellent, toute donation parfaite vient d\'en haut, descendant du Père des lumières.' },
  { ref: '2 Timothée 1,7', text: 'Car ce n\'est pas un esprit de timidité que Dieu nous a donné, mais un esprit de force, d\'amour et de maîtrise de soi.' },
  { ref: 'Lamentations 3,22-23', text: 'L\'amour du Seigneur ne prend pas fin, sa tendresse ne s\'épuise pas. Elle se renouvelle chaque matin.' },
  { ref: 'Philippiens 4,6-7', text: 'Ne vous inquiétez de rien, mais en toute circonstance recourez à Dieu par la prière et la supplication, avec action de grâce.' },
];

const VERSETS_EN = [
  { ref: 'John 14:6', text: 'I am the way, the truth, and the life. No one comes to the Father except through me.' },
  { ref: 'Jeremiah 29:11', text: 'For I know the plans I have for you, declares the Lord, plans to prosper you and not to harm you, plans to give you hope and a future.' },
  { ref: 'Philippians 4:13', text: 'I can do all things through Christ who strengthens me.' },
  { ref: 'Romans 8:28', text: 'And we know that in all things God works for the good of those who love him.' },
  { ref: 'Psalm 23:1', text: 'The Lord is my shepherd, I shall not want.' },
  { ref: 'Matthew 11:28', text: 'Come to me, all you who are weary and burdened, and I will give you rest.' },
  { ref: 'Joshua 1:9', text: 'Be strong and courageous. Do not be afraid; do not be discouraged, for the Lord your God will be with you wherever you go.' },
  { ref: 'Isaiah 40:31', text: 'But those who hope in the Lord will renew their strength. They will soar on wings like eagles.' },
  { ref: 'Matthew 6:33', text: 'But seek first his kingdom and his righteousness, and all these things will be given to you as well.' },
  { ref: 'John 3:16', text: 'For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life.' },
];

const getDayOfYear = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  return Math.floor((now.getTime() - start.getTime()) / 86400000);
};

export const VersetDuJour = () => {
  const { i18n } = useTranslation();
  const [showAlt, setShowAlt] = useState(false);

  const versets = i18n.language === 'en' ? VERSETS_EN : VERSETS_FR;
  const day = getDayOfYear();

  const verset = useMemo(() => {
    const idx = (day + (showAlt ? 1 : 0)) % versets.length;
    return versets[idx];
  }, [day, showAlt, versets]);

  const share = async () => {
    const text = `"${verset.text}" — ${verset.ref}`;
    if (navigator.share) {
      try { await navigator.share({ text }); return; } catch {}
    }
    await navigator.clipboard.writeText(text);
    toast.success('Verset copié !');
  };

  return (
    <section className="py-10 px-4 bg-gradient-to-b from-background to-primary/5">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-center gap-2 mb-5">
          <BookOpen className="h-4 w-4 text-cathedral-gold" />
          <span className="text-xs font-semibold uppercase tracking-[0.25em] text-cathedral-gold">
            Verset du jour
          </span>
        </div>

        <div className="relative rounded-2xl border border-cathedral-gold/20 bg-card/80 backdrop-blur-sm p-8 text-center shadow-[0_8px_40px_-15px_hsl(var(--primary)/0.15)]">
          {/* Decorative quotes */}
          <span className="absolute top-4 left-5 text-5xl font-serif text-cathedral-gold/20 leading-none select-none">"</span>
          <span className="absolute bottom-4 right-5 text-5xl font-serif text-cathedral-gold/20 leading-none select-none">"</span>

          <p className="font-['Playfair_Display',serif] text-lg sm:text-xl text-foreground leading-relaxed italic mb-5 relative z-10">
            {verset.text}
          </p>

          <p className="text-sm font-bold text-cathedral-gold tracking-wider uppercase">
            — {verset.ref}
          </p>

          <div className="flex items-center justify-center gap-3 mt-6">
            <Button size="sm" variant="outline" onClick={share} className="gap-1.5 rounded-full border-cathedral-gold/30 text-cathedral-gold hover:bg-cathedral-gold/10">
              <Share2 className="h-3.5 w-3.5" /> Partager
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowAlt(v => !v)} className="gap-1.5 rounded-full text-muted-foreground hover:text-foreground">
              <RefreshCw className="h-3.5 w-3.5" /> Autre verset
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default VersetDuJour;
