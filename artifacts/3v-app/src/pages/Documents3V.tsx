import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import Navigation from '@/components/Navigation';
import { FileText, Download, ExternalLink, BookOpen, Scale, Users, Smartphone, Heart, Anchor, Feather, ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Document3V {
  id: string;
  titleKey: string;
  descriptionKey: string;
  filename: string;
  icon: React.ElementType;
  categoryKey: string;
  color: string;
  badgeKey: string;
}

const documents: Document3V[] = [
  {
    id: 'statuts',
    titleKey: 'documents3v.statuts.title',
    descriptionKey: 'documents3v.statuts.description',
    filename: 'statuts-3v.pdf',
    icon: Scale,
    categoryKey: 'documents3v.category.fondateurs',
    color: 'bg-purple-500/10 text-purple-700 border-purple-500/20',
    badgeKey: 'documents3v.badge.fondateur',
  },
  {
    id: 'reglement-interieur',
    titleKey: 'documents3v.reglementInterieur.title',
    descriptionKey: 'documents3v.reglementInterieur.description',
    filename: 'reglement-interieur-3v.pdf',
    icon: BookOpen,
    categoryKey: 'documents3v.category.fondateurs',
    color: 'bg-indigo-500/10 text-indigo-700 border-indigo-500/20',
    badgeKey: 'documents3v.badge.fondateur',
  },
  {
    id: 'regle-de-vie',
    titleKey: 'documents3v.regleDeVie.title',
    descriptionKey: 'documents3v.regleDeVie.description',
    filename: 'regle-de-vie-3v.pdf',
    icon: Heart,
    categoryKey: 'documents3v.category.fondateurs',
    color: 'bg-rose-500/10 text-rose-700 border-rose-500/20',
    badgeKey: 'documents3v.badge.spirituel',
  },
  {
    id: 'texte-charisme',
    titleKey: 'documents3v.texteCharisme.title',
    descriptionKey: 'documents3v.texteCharisme.description',
    filename: 'texte-charisme-3v.pdf',
    icon: Feather,
    categoryKey: 'documents3v.category.fondateurs',
    color: 'bg-amber-500/10 text-amber-700 border-amber-500/20',
    badgeKey: 'documents3v.badge.spirituel',
  },
  {
    id: 'acte-fondation',
    titleKey: 'documents3v.acteFondation.title',
    descriptionKey: 'documents3v.acteFondation.description',
    filename: 'acte-fondation-3v.pdf',
    icon: Anchor,
    categoryKey: 'documents3v.category.fondateurs',
    color: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20',
    badgeKey: 'documents3v.badge.fondateur',
  },
  {
    id: 'reglement-numerique',
    titleKey: 'documents3v.reglementNumerique.title',
    descriptionKey: 'documents3v.reglementNumerique.description',
    filename: 'reglement-numerique-3v.pdf',
    icon: Smartphone,
    categoryKey: 'documents3v.category.reglements',
    color: 'bg-sky-500/10 text-sky-700 border-sky-500/20',
    badgeKey: 'documents3v.badge.reglementaire',
  },
  {
    id: 'formulaires-adhesion',
    titleKey: 'documents3v.formulairesAdhesion.title',
    descriptionKey: 'documents3v.formulairesAdhesion.description',
    filename: 'formulaires-adhesion-3v.pdf',
    icon: ClipboardList,
    categoryKey: 'documents3v.category.adhesion',
    color: 'bg-teal-500/10 text-teal-700 border-teal-500/20',
    badgeKey: 'documents3v.badge.adhesion',
  },
  {
    id: 'memorandum-revision',
    titleKey: 'documents3v.memorandumRevision.title',
    descriptionKey: 'documents3v.memorandumRevision.description',
    filename: 'memorandum-revision-2033-3v.pdf',
    icon: Users,
    categoryKey: 'documents3v.category.gouvernance',
    color: 'bg-slate-500/10 text-slate-700 border-slate-500/20',
    badgeKey: 'documents3v.badge.gouvernance',
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const Documents3V = () => {
  const { t } = useTranslation();

  const handleView = (filename: string) => {
    window.open(`/documents/${filename}`, '_blank');
  };

  const handleDownload = (filename: string, title: string) => {
    const link = document.createElement('a');
    link.href = `/documents/${filename}`;
    link.download = filename;
    link.setAttribute('aria-label', title);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="pt-20 pb-16">
        <div className="container mx-auto px-4 max-w-5xl">

          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <div className="flex justify-center mb-4">
              <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20">
                <FileText className="w-10 h-10 text-primary" />
              </div>
            </div>
            <h1 className="text-3xl md:text-4xl font-playfair font-bold text-foreground mb-3">
              {t('documents3v.title')}
            </h1>
            <p className="text-muted-foreground text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
              {t('documents3v.subtitle')}
            </p>
            <div className="mt-4 text-xs text-muted-foreground italic">
              « Je suis le chemin, la vérité et la vie. » — Jean 14,6
            </div>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 md:grid-cols-2 gap-5"
          >
            {documents.map((doc) => {
              const Icon = doc.icon;
              const title = t(doc.titleKey);
              return (
                <motion.div key={doc.id} variants={cardVariants}>
                  <Card className="h-full border border-border/60 hover:border-primary/30 hover:shadow-md transition-all duration-200 group">
                    <CardHeader className="pb-3">
                      <div className="flex items-start gap-3">
                        <div className={`p-2.5 rounded-xl border ${doc.color} flex-shrink-0`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <Badge variant="outline" className={`text-xs px-2 py-0.5 ${doc.color}`}>
                              {t(doc.badgeKey)}
                            </Badge>
                          </div>
                          <CardTitle className="text-base font-semibold leading-snug group-hover:text-primary transition-colors">
                            {title}
                          </CardTitle>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <CardDescription className="text-sm leading-relaxed mb-4">
                        {t(doc.descriptionKey)}
                      </CardDescription>
                      <div className="flex gap-2">
                        <Button
                          variant="default"
                          size="sm"
                          className="flex-1 gap-1.5"
                          onClick={() => handleView(doc.filename)}
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          {t('documents3v.view')}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5"
                          onClick={() => handleDownload(doc.filename, title)}
                        >
                          <Download className="w-3.5 h-3.5" />
                          {t('documents3v.download')}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.5 }}
            className="mt-12 p-5 rounded-2xl bg-muted/40 border border-border/60 text-center"
          >
            <p className="text-sm text-muted-foreground">
              {t('documents3v.footer')}
            </p>
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default Documents3V;
