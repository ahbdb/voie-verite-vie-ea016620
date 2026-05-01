import { memo } from 'react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import Navigation from '@/components/Navigation';
import { 
  Users, Calendar, GraduationCap, Briefcase, Globe, Mail, Phone, MapPin, 
  Heart, Cross, Book, Target, Award, Mic, Radio, Code, PenTool, 
  MessageSquare, Star, ChevronRight, ExternalLink
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import creatorPhoto from '@/assets/creator-photo.webp';

const fadeUp = { hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0 } };

const Creator = memo(() => {
  const { t, i18n } = useTranslation();

  const founderFr = {
    name: 'AHOUFACK Dylanne Baudouin',
    title: 'Fondateur & Promoteur de VOIE, VÉRITÉ, VIE (3V)',
    birthDate: '14 septembre 2001',
    birthPlace: 'Fossong-Wentcheng, Cameroun',
    bio: `Jeune Entrepreneur; enseignant; Concepteur Designer; Community Manager; Développeur d'applications; Formateur... sont les différentes casquettes qui définissent ma modeste personne dans le domaine Informatique. Passionné par la technologie et la foi catholique, j'ai créé l'application 3V pour aider les jeunes à découvrir et approfondir leur foi à travers une lecture structurée de la Bible. Actuellement étudiant en Intelligence Artificielle en Italie.`,
    vision: `Ma vision est de créer un "sanctuaire spirituel" numérique accessible à tous, combinant technologie et spiritualité pour aider des milliers de catholiques à approfondir leur foi. En utilisant mes talents en informatique et en théologie au service de l'Église, je souhaite bâtir une communauté unie par la foi biblique.`,
    education: [
      { degree: 'Étudiant en Intelligence Artificielle', institution: 'Università della Calabria, Italie', year: 'Depuis 2025', icon: Code },
      { degree: 'Diplôme en Théologie', institution: "ECATHED - École Cathédrale de Théologie pour les laïcs de l'Archidiocèse de Douala", year: 'Juillet 2025', icon: Cross },
      { degree: 'CILS B2 - Certificazione di Italiano come Lingua Straniera', institution: 'CLID, Douala', year: '2022', icon: Globe },
      { degree: 'Licence Professionnelle en Génie Logiciel', institution: 'IUG - Institut Universitaire du Golf de Guinée', year: '2021', icon: Code },
      { degree: 'Licence Académique en Mathématiques', institution: 'Université de Douala', year: '2021', icon: Target },
      { degree: 'BTS en Génie Logiciel', institution: 'ISTG-AC, Douala', year: '2020', icon: Code },
    ],
    experience: [
      { role: 'Chef des départements Mathématiques et Informatique', company: 'Plateforme EXAM-PREP', description: 'Direction académique et pédagogique des programmes de préparation aux examens', since: '2023', icon: GraduationCap },
      { role: "Enseignant d'Informatique", company: 'Collège Catholique Saint Nicolas & Collège BAHO', description: "Transmission du savoir informatique aux jeunes dans le cadre de l'éducation catholique", since: '2023', icon: Book },
      { role: 'Responsable Informatique et Communication', company: 'ONG GEN Cameroon & Youth Business Cameroon', description: "Développement des outils numériques et stratégies de communication pour l'impact social", since: '2023', icon: MessageSquare },
      { role: 'Formateur', company: 'PI Startup (Progress Intelligent Startup)', description: "Formation en développement d'applications et technologies numériques", since: '2021', icon: Award },
      { role: 'Présentateur et Chroniqueur', company: 'Radio et Télé catholique VERITAS - Émission Canal Campus', description: "Animation d'émissions dédiées à la jeunesse catholique et à l'évangélisation", since: '2022', icon: Radio },
    ],
    skills: [
      { name: 'Enseignement', icon: GraduationCap },
      { name: "Développement d'applications", icon: Code },
      { name: 'Community Management', icon: Users },
      { name: 'Conception & Design', icon: PenTool },
      { name: 'Secrétariat Bureautique', icon: Briefcase },
      { name: 'Formation', icon: Award },
      { name: 'Communication', icon: Mic },
    ],
    languages: [
      { name: 'Français', level: 'Natif' },
      { name: 'Anglais', level: 'Courant' },
      { name: 'Italien', level: 'B2 Certifié' },
      { name: 'Yemba', level: 'Courant' },
    ],
    qualities: ['Courageux', 'Discipliné', 'Rigoureux', 'Ponctuel', 'Adaptation facile', 'Passionné', 'Créatif'],
    socialLinks: {
      youtube: 'https://youtube.com/@voie-verite-vie?si=qD8LmbyREJdQm1Db',
      whatsappChannel: 'https://whatsapp.com/channel/0029VbB0GplLY6d6hkP5930J',
      whatsappGroup: 'https://chat.whatsapp.com/FfvCe9nHwpj5OYoDZBfGER',
      portfolio: 'https://ahdybau.netlify.app',
      email: 'ahdybau@gmail.com',
      whatsapp: '+39 351 343 0349',
    }
  };

  const founderEn = {
    ...founderFr,
    title: 'Founder & Promoter of WAY, TRUTH, LIFE (3V)',
    birthDate: 'September 14, 2001',
    birthPlace: 'Fossong-Wentcheng, Cameroon',
    bio: `Young entrepreneur, teacher, designer, community manager, app developer and trainer... these are the many hats that define me in the tech field. Passionate about technology and the Catholic faith, I created the 3V app to help young people discover and deepen their faith through a structured Bible reading path. I am currently studying Artificial Intelligence in Italy.`,
    vision: `My vision is to build a digital "spiritual sanctuary" accessible to everyone, combining technology and spirituality to help thousands of Catholics deepen their faith. By putting my tech and theology skills at the service of the Church, I want to build a community united by biblical faith.`,
    education: [
      { degree: 'Artificial Intelligence Student', institution: 'Università della Calabria, Italy', year: 'Since 2025', icon: Code },
      { degree: 'Diploma in Theology', institution: 'ECATHED - Cathedral School of Theology for Lay People of the Archdiocese of Douala', year: 'July 2025', icon: Cross },
      { degree: 'CILS B2 - Certificazione di Italiano come Lingua Straniera', institution: 'CLID, Douala', year: '2022', icon: Globe },
      { degree: 'Professional Bachelor in Software Engineering', institution: 'IUG - Gulf of Guinea University Institute', year: '2021', icon: Code },
      { degree: 'Academic Bachelor in Mathematics', institution: 'University of Douala', year: '2021', icon: Target },
      { degree: 'Higher National Diploma in Software Engineering', institution: 'ISTG-AC, Douala', year: '2020', icon: Code },
    ],
    experience: [
      { role: 'Head of Mathematics and Computer Science Departments', company: 'EXAM-PREP Platform', description: 'Academic and pedagogical leadership of exam preparation programs', since: '2023', icon: GraduationCap },
      { role: 'Computer Science Teacher', company: 'Saint Nicolas Catholic College & BAHO College', description: 'Teaching computer science to young people within Catholic education', since: '2023', icon: Book },
      { role: 'IT and Communication Manager', company: 'GEN Cameroon NGO & Youth Business Cameroon', description: 'Development of digital tools and communication strategies for social impact', since: '2023', icon: MessageSquare },
      { role: 'Trainer', company: 'PI Startup (Progress Intelligent Startup)', description: 'Training in app development and digital technologies', since: '2021', icon: Award },
      { role: 'Presenter and Columnist', company: 'VERITAS Catholic Radio & TV - Canal Campus Show', description: 'Hosting programs dedicated to Catholic youth and evangelization', since: '2022', icon: Radio },
    ],
    skills: [
      { name: 'Teaching', icon: GraduationCap },
      { name: 'App Development', icon: Code },
      { name: 'Community Management', icon: Users },
      { name: 'Design', icon: PenTool },
      { name: 'Office Administration', icon: Briefcase },
      { name: 'Training', icon: Award },
      { name: 'Communication', icon: Mic },
    ],
    languages: [
      { name: 'French', level: 'Native' },
      { name: 'English', level: 'Fluent' },
      { name: 'Italian', level: 'Certified B2' },
      { name: 'Yemba', level: 'Fluent' },
    ],
    qualities: ['Courageous', 'Disciplined', 'Rigorous', 'Punctual', 'Adaptable', 'Passionate', 'Creative'],
  };

  const founderIt = {
    ...founderFr,
    title: 'Fondatore & Promotore di VIA, VERITÀ, VITA (3V)',
    birthDate: '14 settembre 2001',
    birthPlace: 'Fossong-Wentcheng, Camerun',
    bio: `Giovane imprenditore, insegnante, designer, community manager, sviluppatore di applicazioni e formatore... sono i diversi ruoli che mi definiscono nel settore informatico. Appassionato di tecnologia e fede cattolica, ho creato l'app 3V per aiutare i giovani a scoprire e approfondire la loro fede attraverso una lettura strutturata della Bibbia. Attualmente studio Intelligenza Artificiale in Italia.`,
    vision: `La mia visione è creare un "santuario spirituale" digitale accessibile a tutti, unendo tecnologia e spiritualità per aiutare migliaia di cattolici ad approfondire la propria fede. Mettendo i miei talenti nell'informatica e nella teologia al servizio della Chiesa, desidero costruire una comunità unita dalla fede biblica.`,
    education: [
      { degree: 'Studente in Intelligenza Artificiale', institution: 'Università della Calabria, Italia', year: 'Dal 2025', icon: Code },
      { degree: 'Diploma in Teologia', institution: "ECATHED - Scuola Cattedrale di Teologia per i laici dell'Arcidiocesi di Douala", year: 'Luglio 2025', icon: Cross },
      { degree: 'CILS B2 - Certificazione di Italiano come Lingua Straniera', institution: 'CLID, Douala', year: '2022', icon: Globe },
      { degree: 'Laurea Professionale in Ingegneria del Software', institution: 'IUG - Istituto Universitario del Golfo di Guinea', year: '2021', icon: Code },
      { degree: 'Laurea in Matematica', institution: 'Università di Douala', year: '2021', icon: Target },
      { degree: 'BTS in Ingegneria del Software', institution: 'ISTG-AC, Douala', year: '2020', icon: Code },
    ],
    experience: [
      { role: 'Responsabile dei dipartimenti di Matematica e Informatica', company: 'Piattaforma EXAM-PREP', description: 'Direzione accademica e pedagogica dei programmi di preparazione agli esami', since: '2023', icon: GraduationCap },
      { role: 'Docente di Informatica', company: 'Collegio Cattolico Saint Nicolas & Collegio BAHO', description: "Trasmissione del sapere informatico ai giovani nel contesto dell'educazione cattolica", since: '2023', icon: Book },
      { role: 'Responsabile IT e Comunicazione', company: 'ONG GEN Cameroon & Youth Business Cameroon', description: 'Sviluppo di strumenti digitali e strategie di comunicazione per impatto sociale', since: '2023', icon: MessageSquare },
      { role: 'Formatore', company: 'PI Startup (Progress Intelligent Startup)', description: 'Formazione nello sviluppo di applicazioni e tecnologie digitali', since: '2021', icon: Award },
      { role: 'Presentatore e Cronista', company: 'Radio e TV cattolica VERITAS - Trasmissione Canal Campus', description: "Conduzione di programmi dedicati ai giovani cattolici e all'evangelizzazione", since: '2022', icon: Radio },
    ],
    skills: [
      { name: 'Insegnamento', icon: GraduationCap },
      { name: 'Sviluppo di applicazioni', icon: Code },
      { name: 'Community Management', icon: Users },
      { name: 'Progettazione & Design', icon: PenTool },
      { name: 'Segreteria e ufficio', icon: Briefcase },
      { name: 'Formazione', icon: Award },
      { name: 'Comunicazione', icon: Mic },
    ],
    languages: [
      { name: 'Francese', level: 'Madrelingua' },
      { name: 'Inglese', level: 'Fluente' },
      { name: 'Italiano', level: 'B2 Certificato' },
      { name: 'Yemba', level: 'Fluente' },
    ],
    qualities: ['Coraggioso', 'Disciplinato', 'Rigoroso', 'Puntuale', 'Adattabile', 'Appassionato', 'Creativo'],
  };

  const founder = i18n.language.startsWith('en') ? founderEn : i18n.language.startsWith('it') ? founderIt : founderFr;

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Person",
    "name": founder.name,
    "jobTitle": founder.title,
    "birthDate": "2001-09-14",
    "birthPlace": { "@type": "Place", "name": founder.birthPlace },
    "sameAs": [founder.socialLinks.youtube],
    "knowsLanguage": founder.languages.map(l => l.name),
  };

  return (
    <>
      <Helmet>
        <title>AHOUFACK Dylanne Baudouin - Fondateur de Voie, Vérité, Vie (3V)</title>
        <meta name="description" content="Découvrez AHOUFACK Dylanne Baudouin, fondateur de l'application 3V (Voie, Vérité, Vie)." />
        <link rel="canonical" href="https://voie-verite-vie.lovable.app/createur" />
        <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
      </Helmet>

      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="pt-16">
          {/* Hero with photo - EXTRAORDINARY */}
          <section className="relative py-20 overflow-hidden">
            {/* Aurora animated background */}
            <div className="absolute inset-0 bg-aurora" />
            
            {/* Floating orbs */}
            <motion.div className="absolute top-20 left-[10%] w-32 h-32 rounded-full bg-cathedral-gold/5 blur-3xl" animate={{ y: [-20, 20, -20], x: [-10, 10, -10] }} transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }} />
            <motion.div className="absolute bottom-10 right-[15%] w-40 h-40 rounded-full bg-stained-blue/5 blur-3xl" animate={{ y: [15, -15, 15], x: [10, -10, 10] }} transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }} />
            <motion.div className="absolute top-1/2 left-[60%] w-24 h-24 rounded-full bg-stained-ruby/5 blur-3xl" animate={{ y: [10, -20, 10] }} transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }} />
            
            <div className="container mx-auto px-4 relative z-10">
              <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center gap-12">
                {/* Photo with extraordinary frame */}
                <motion.div 
                  initial={{ opacity: 0, scale: 0.6, rotate: -5 }} 
                  animate={{ opacity: 1, scale: 1, rotate: 0 }} 
                  transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                  className="flex-shrink-0 relative"
                >
                  {/* Orbiting particles */}
                  {[0, 72, 144, 216, 288].map((deg, i) => (
                    <motion.div
                      key={i}
                      className="absolute top-1/2 left-1/2 w-2 h-2 rounded-full bg-cathedral-gold"
                      style={{ marginTop: -4, marginLeft: -4 }}
                      animate={{
                        x: [Math.cos((deg * Math.PI) / 180) * 85, Math.cos(((deg + 360) * Math.PI) / 180) * 85],
                        y: [Math.sin((deg * Math.PI) / 180) * 85, Math.sin(((deg + 360) * Math.PI) / 180) * 85],
                        opacity: [0.3, 0.8, 0.3],
                        scale: [0.5, 1.2, 0.5],
                      }}
                      transition={{ duration: 8, repeat: Infinity, ease: 'linear', delay: i * 1.6 }}
                    />
                  ))}
                  
                  {/* Ripple rings */}
                  {[0, 1, 2].map(i => (
                    <motion.div
                      key={`ring-${i}`}
                      className="absolute inset-0 rounded-full border border-cathedral-gold/20"
                      animate={{ scale: [1, 1.8], opacity: [0.4, 0] }}
                      transition={{ duration: 3, repeat: Infinity, delay: i * 1, ease: 'easeOut' }}
                    />
                  ))}
                  
                  {/* Morphing glow behind */}
                  <motion.div
                    className="absolute -inset-4 rounded-full bg-gradient-to-br from-cathedral-gold/20 via-stained-blue/10 to-cathedral-gold/20 blur-xl animate-morph"
                    animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
                    transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
                  />
                  
                  {/* Rotating golden border */}
                  <div className="relative w-52 h-52 md:w-64 md:h-64 animate-glow-pulse" style={{ borderRadius: '50%' }}>
                    <motion.div
                      className="absolute -inset-1 rounded-full"
                      style={{
                        background: 'conic-gradient(from 0deg, hsl(43 65% 52%), hsl(350 65% 45% / 0.5), hsl(43 55% 72%), hsl(220 75% 55% / 0.3), hsl(43 65% 52%))',
                      }}
                      animate={{ rotate: 360 }}
                      transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
                    />
                    <div className="absolute inset-1 rounded-full bg-background" />
                    <div className="absolute inset-2 rounded-full overflow-hidden">
                      <motion.img 
                        src={creatorPhoto} 
                        alt={founder.name} 
                        className="w-full h-full object-cover"
                        whileHover={{ scale: 1.1 }}
                        transition={{ duration: 0.5 }}
                      />
                    </div>
                  </div>
                </motion.div>

                {/* Name & title with gradient text */}
                <motion.div initial="hidden" animate="visible" variants={fadeUp} transition={{ duration: 0.6, delay: 0.3 }}>
                  <motion.h1 
                    className="text-3xl md:text-5xl font-cinzel font-bold mb-2 text-gradient-gold"
                    animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
                    transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    {founder.name}
                  </motion.h1>
                  <p className="text-lg text-cathedral-gold/80 font-inter mb-4">{founder.title}</p>
                  <div className="flex flex-wrap gap-3">
                    <Badge variant="outline" className="border-cathedral-gold/30 text-muted-foreground"><Calendar className="w-3 h-3 mr-1" />{founder.birthDate}</Badge>
                    <Badge variant="outline" className="border-cathedral-gold/30 text-muted-foreground"><MapPin className="w-3 h-3 mr-1" />{founder.birthPlace}</Badge>
                  </div>
                </motion.div>
              </div>
            </div>
          </section>

          <div className="cathedral-line w-full" />

          {/* Bio & Vision - flat layout */}
          <section className="py-10">
            <div className="container mx-auto px-4 max-w-4xl">
              <div className="grid md:grid-cols-2 gap-12">
                <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
                  <div className="flex items-center gap-2 mb-4">
                    <Heart className="w-5 h-5 text-cathedral-gold" />
                    <h2 className="text-xl font-cinzel font-bold text-foreground">{t('creator.aboutMe')}</h2>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed font-inter">{founder.bio}</p>
                </motion.div>
                <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} transition={{ delay: 0.15 }}>
                  <div className="flex items-center gap-2 mb-4">
                    <Target className="w-5 h-5 text-cathedral-gold" />
                    <h2 className="text-xl font-cinzel font-bold text-foreground">{t('creator.myVision')}</h2>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed font-inter">{founder.vision}</p>
                </motion.div>
              </div>
            </div>
          </section>

          <div className="cathedral-line w-full" />

          {/* Education - flat timeline */}
          <section className="py-10">
            <div className="container mx-auto px-4 max-w-3xl">
              <h2 className="text-2xl font-cinzel font-bold text-foreground text-center mb-8 flex items-center justify-center gap-3">
                <GraduationCap className="w-6 h-6 text-cathedral-gold" />{t('creator.education')}
              </h2>
              <div className="relative pl-8">
                <div className="absolute left-3 top-0 bottom-0 w-px bg-gradient-to-b from-cathedral-gold/60 via-cathedral-gold/20 to-transparent" />
                {founder.education.map((edu, i) => {
                  const Icon = edu.icon;
                  return (
                    <motion.div key={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} transition={{ delay: i * 0.1 }} className="relative mb-6 last:mb-0">
                      <div className="absolute -left-5 top-1 w-3 h-3 rounded-full bg-cathedral-gold/80" />
                      <div className="flex items-start gap-3">
                        <Icon className="w-4 h-4 text-cathedral-gold/60 mt-0.5 flex-shrink-0" />
                        <div>
                          <h3 className="text-sm font-semibold text-foreground">{edu.degree}</h3>
                          <p className="text-xs text-muted-foreground font-inter">{edu.institution}</p>
                          <span className="text-[10px] text-cathedral-gold/60 font-inter">{edu.year}</span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </section>

          <div className="cathedral-line w-full" />

          {/* Experience - flat list */}
          <section className="py-10">
            <div className="container mx-auto px-4 max-w-3xl">
              <h2 className="text-2xl font-cinzel font-bold text-foreground text-center mb-8 flex items-center justify-center gap-3">
                <Briefcase className="w-6 h-6 text-cathedral-gold" />{t('creator.experience')}
              </h2>
              <div className="space-y-6">
                {founder.experience.map((exp, i) => {
                  const Icon = exp.icon;
                  return (
                    <motion.div key={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} transition={{ delay: i * 0.1 }} className="flex gap-4 border-b border-border/30 pb-5 last:border-0">
                      <div className="w-10 h-10 rounded-full bg-cathedral-gold/10 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-5 h-5 text-cathedral-gold" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-foreground">{exp.role}</h3>
                        <p className="text-xs text-cathedral-gold/70 font-inter">{exp.company}</p>
                        <p className="text-xs text-muted-foreground mt-1 font-inter">{exp.description}</p>
                        <span className="text-[10px] text-muted-foreground/60 font-inter">{t('creator.since')} {exp.since}</span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </section>

          <div className="cathedral-line w-full" />

          {/* Skills / Languages / Qualities - flat grid */}
          <section className="py-10">
            <div className="container mx-auto px-4 max-w-4xl">
              <div className="grid md:grid-cols-3 gap-10">
                <div>
                  <h3 className="text-lg font-cinzel font-bold text-foreground mb-4 flex items-center gap-2">
                    <Star className="w-4 h-4 text-cathedral-gold" />{t('creator.skills')}
                  </h3>
                  <div className="space-y-2">
                    {founder.skills.map((s, i) => { const Icon = s.icon; return (
                      <div key={i} className="flex items-center gap-2 text-sm font-inter text-muted-foreground">
                        <Icon className="w-3.5 h-3.5 text-cathedral-gold/60" />{s.name}
                      </div>
                    ); })}
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-cinzel font-bold text-foreground mb-4 flex items-center gap-2">
                    <Globe className="w-4 h-4 text-cathedral-gold" />{t('creator.languages')}
                  </h3>
                  <div className="space-y-2">
                    {founder.languages.map((l, i) => (
                      <div key={i} className="flex items-center justify-between text-sm font-inter">
                        <span className="text-muted-foreground">{l.name}</span>
                        <span className="text-xs text-cathedral-gold/60">{l.level}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-cinzel font-bold text-foreground mb-4 flex items-center gap-2">
                    <Heart className="w-4 h-4 text-cathedral-gold" />{t('creator.qualities')}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {founder.qualities.map((q, i) => (
                      <span key={i} className="text-xs px-3 py-1 rounded-full border border-cathedral-gold/20 text-muted-foreground font-inter">{q}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <div className="cathedral-line w-full" />

          {/* CTA */}
          <section className="py-12">
            <div className="container mx-auto px-4 max-w-3xl text-center">
              <h2 className="text-2xl font-cinzel font-bold text-foreground mb-3">{t('creator.joinMovement')}</h2>
              <p className="text-sm text-muted-foreground mb-8 font-inter">{t('creator.joinMovementDesc')}</p>
              <div className="flex flex-wrap gap-3 justify-center mb-6">
                <Button asChild className="gap-2 bg-cathedral-gold hover:bg-cathedral-gold/90 text-cathedral-navy"><a href={founder.socialLinks.portfolio} target="_blank" rel="noopener noreferrer"><ExternalLink className="w-4 h-4" />Portfolio</a></Button>
                <Button asChild variant="outline" className="gap-2 border-cathedral-gold/30"><a href={`mailto:${founder.socialLinks.email}`}><Mail className="w-4 h-4" />{founder.socialLinks.email}</a></Button>
                <Button asChild variant="outline" className="gap-2 border-cathedral-gold/30"><a href={`https://wa.me/${founder.socialLinks.whatsapp.replace(/\s/g, '')}`} target="_blank" rel="noopener noreferrer"><Phone className="w-4 h-4" />{founder.socialLinks.whatsapp}</a></Button>
              </div>
              <div className="flex flex-wrap gap-3 justify-center">
                <Button asChild variant="outline" size="sm" className="gap-2 border-cathedral-gold/30"><a href={founder.socialLinks.youtube} target="_blank" rel="noopener noreferrer"><ExternalLink className="w-4 h-4" />{t('creator.youtubeChannel')}</a></Button>
                <Button asChild variant="outline" size="sm" className="gap-2 border-cathedral-gold/30"><a href={founder.socialLinks.whatsappChannel} target="_blank" rel="noopener noreferrer"><ChevronRight className="w-4 h-4" />{t('creator.whatsappChannel')}</a></Button>
                <Button asChild variant="outline" size="sm" className="gap-2 border-cathedral-gold/30"><a href={founder.socialLinks.whatsappGroup} target="_blank" rel="noopener noreferrer"><Users className="w-4 h-4" />{t('creator.whatsappGroup')}</a></Button>
              </div>
            </div>
          </section>

          {/* Footer mini */}
          <div className="cathedral-line w-full" />
          <section className="py-8">
            <div className="container mx-auto px-4 text-center">
              <div className="flex items-center justify-center gap-3 mb-3">
                <Cross className="w-5 h-5 text-cathedral-gold/50" />
                <Book className="w-5 h-5 text-cathedral-gold/50" />
                <Heart className="w-5 h-5 text-cathedral-gold/50" />
              </div>
              <p className="text-xs text-muted-foreground/60 font-inter italic">{t('about.mainVerse')}</p>
            </div>
          </section>
        </main>
      </div>
    </>
  );
});

Creator.displayName = 'Creator';
export default Creator;
