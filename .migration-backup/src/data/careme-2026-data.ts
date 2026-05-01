type DayActions = { soi: string; prochain: string; dieu: string };
type Day = { date: string; title?: string; readings: string; actions: DayActions };
type Week = { title: string; range: string; days: Day[] };
type CaremeData = { fullProgram: Week[] };

const fr: CaremeData = {
  fullProgram: [
    {
      title: 'Semaine 1 de Carême', range: '18–22 février',
      days: [
        { date: 'Mercredi 18 février', title: 'Mercredi des Cendres', readings: 'Jl 2,12-18 / Ps 50 / 2 Co 5,20-6,2 / Mt 6,1-6.16-18', actions: { soi: "Faire un examen de conscience approfondi", prochain: "Demander pardon à une personne que j'ai blessée", dieu: "Participer à la messe et recevoir les cendres, faire un acte de contrition" } },
        { date: 'Jeudi 19 février', readings: 'Dt 30,15-20 / Ps 1 / Lc 9,22-25', actions: { soi: "Écrire mes 3 résolutions définitives dans un carnet", prochain: "Appeler un proche que j'ai négligé depuis longtemps", dieu: "Méditer 15 minutes sur le choix entre la vie et la mort" } },
        { date: 'Vendredi 20 février', readings: 'Is 58,1-9a / Ps 50 / Mt 9,14-15', actions: { soi: "Ne publier aucun contenu négatif sur les réseaux sociaux aujourd'hui", prochain: "Faire une œuvre de miséricorde corporelle", dieu: "Chemin de Croix complet" } },
        { date: 'Samedi 21 février', readings: 'Is 58,9b-14 / Ps 85 / Lc 5,27-32', actions: { soi: "Lire l'Évangile du jour et noter un enseignement", prochain: "Inviter quelqu'un d'éloigné de Dieu à prier avec moi", dieu: "Prier pour ma conversion et celle des pécheurs" } },
        { date: 'Dimanche 22 février', title: 'Dimanche — PAS DE JEÛNE', readings: '', actions: { soi: 'Repos liturgique / Messe dominicale', prochain: '—', dieu: '—' } },
      ],
    },
    {
      title: 'Semaine 2 de Carême', range: '23–28 février',
      days: [
        { date: 'Lundi 23 février', readings: 'Lv 19,1-2.11-18 / Ps 18 / Mt 25,31-46', actions: { soi: "Jeûner de toute plainte aujourd'hui", prochain: "Donner de l'argent à un mendiant", dieu: "Méditer sur le jugement dernier et mes œuvres de charité" } },
        { date: 'Mardi 24 février', readings: 'Is 55,10-11 / Ps 33 / Mt 6,7-15', actions: { soi: 'Me lever 30 minutes plus tôt pour prier', prochain: "Pardonner intérieurement à quelqu'un qui m'a offensé", dieu: 'Copier le Notre Père et méditer chaque phrase' } },
        { date: 'Mercredi 25 février', readings: 'Jon 3,1-10 / Ps 50 / Lc 11,29-32', actions: { soi: 'Identifier mon péché principal et décider un plan pour le combattre', prochain: "Écrire une lettre d'encouragement à quelqu'un", dieu: 'Lire le livre de Jonas en entier' } },
        { date: 'Jeudi 26 février', readings: 'Est 14,1.3-5.12-14 / Ps 137 / Mt 7,7-12', actions: { soi: 'Faire une liste de 5 grâces à demander au Seigneur', prochain: "Rendre service à quelqu'un sans qu'il me le demande", dieu: 'Prier avec insistance pour mes intentions' } },
        { date: 'Vendredi 27 février', readings: 'Ez 18,21-28 / Ps 129 / Mt 5,20-26', actions: { soi: "Éteindre mon téléphone de 22h à 4h", prochain: "Aller me réconcilier en personne avec quelqu'un", dieu: 'Chemin de Croix complet' } },
        { date: 'Samedi 28 février', readings: 'Dt 26,16-19 / Ps 118 / Mt 5,43-48', actions: { soi: 'Écrire le nom de mes "ennemis" sur un papier et garder ce papier', prochain: "Faire un acte de bonté envers une personne qui m'a fait du mal", dieu: 'Prier pour la conversion de mes ennemis' } },
        { date: 'Dimanche 1er mars', title: 'Dimanche — PAS DE JEÛNE', readings: '', actions: { soi: 'Repos liturgique / Messe dominicale', prochain: '—', dieu: '—' } },
      ],
    },
    {
      title: 'Semaine 3 de Carême', range: '2–7 mars',
      days: [
        { date: 'Lundi 2 mars', readings: 'Dn 9,4b-10 / Ps 78 / Lc 6,36-38', actions: { soi: 'Ne critiquer personne de toute la journée', prochain: 'Donner des vêtements inutilisés propres à une association', dieu: 'Chapelet de la Miséricorde Divine' } },
        { date: 'Mardi 3 mars', readings: 'Is 1,10.16-20 / Ps 49 / Mt 23,1-12', actions: { soi: "Refuser tout honneur ou compliment aujourd'hui", prochain: "Nettoyer la maison de quelqu'un ou rendre service", dieu: "Méditer sur l'humilité du Christ" } },
        { date: 'Mercredi 4 mars', readings: 'Jr 18,18-20 / Ps 30 / Mt 20,17-28', actions: { soi: 'Accepter une contrariété sans me plaindre', prochain: "Porter les courses d'une personne âgée", dieu: 'Lire le récit de la Passion dans Matthieu' } },
        { date: 'Jeudi 5 mars', readings: 'Jr 17,5-10 / Ps 1 / Lc 16,19-31', actions: { soi: "Calculer combien j'ai économisé pour la visite à l'orphelinat du 4 avril", prochain: "Préparer ou offrir un repas pour une personne ou une famille dans le besoin", dieu: 'Prier pour les pauvres et les affamés du monde' } },
        { date: 'Vendredi 6 mars', readings: 'Gn 37,3-4.12-13a.17b-28 / Ps 104 / Mt 21,33-43.45-46', actions: { soi: "Manifester de l'amour toute la journée", prochain: "Défendre quelqu'un qui est calomnié", dieu: 'Chemin de Croix complet' } },
        { date: 'Samedi 7 mars', readings: 'Mi 7,14-15.18-20 / Ps 102 / Lc 15,1-3.11-32', actions: { soi: 'Relire mes résolutions et évaluer ma fidélité', prochain: "Accueillir chaleureusement quelqu'un que j'avais rejeté", dieu: 'Recevoir le sacrement de Réconciliation (se confesser)' } },
        { date: 'Dimanche 8 mars', title: 'Dimanche — PAS DE JEÛNE', readings: '', actions: { soi: 'Repos liturgique / Messe dominicale', prochain: '—', dieu: '—' } },
      ],
    },
    {
      title: 'Semaine 4 de Carême', range: '9–14 mars',
      days: [
        { date: 'Lundi 9 mars', readings: '2 R 5,1-15a / Ps 41.42 / Lc 4,24-30', actions: { soi: "Obéir à un conseil simple que j'ai toujours refusé", prochain: "Reconnaître publiquement les qualités de quelqu'un", dieu: 'Rendre grâce pour les guérisons reçues' } },
        { date: 'Mardi 10 mars', readings: 'Dn 3,25.34-43 / Ps 24 / Mt 18,21-35', actions: { soi: 'Brûler le papier avec les noms de mes ennemis en guise de pardon', prochain: "Téléphoner à quelqu'un qui m'a blessé pour faire la paix", dieu: 'Méditer sur mes offenses envers Dieu' } },
        { date: 'Mercredi 11 mars', readings: 'Dt 4,1.5-9 / Ps 147 / Mt 5,17-19', actions: { soi: 'Relire les 10 Commandements et examiner ma vie', prochain: 'Enseigner une vérité de foi à un enfant', dieu: 'Lire un Psaume et le prier lentement' } },
        { date: 'Jeudi 12 mars', readings: 'Jr 7,23-28 / Ps 94 / Lc 11,14-23', actions: { soi: 'Passer 15 minutes en silence total pour écouter Dieu', prochain: "Conseiller spirituellement quelqu'un qui me le demande", dieu: "Lire l'Évangile du jour et noter ce que Dieu me dit" } },
        { date: 'Vendredi 13 mars', readings: 'Os 14,2-10 / Ps 80 / Mc 12,28b-34', actions: { soi: 'Renoncer à mon plat préféré au repas du soir', prochain: "Visiter un malade à l'hôpital ou à domicile", dieu: 'Chemin de Croix complet' } },
        { date: 'Samedi 14 mars', readings: 'Os 6,1-6 / Ps 50 / Lc 18,9-14', actions: { soi: 'Écrire mes principaux péchés pour les confesser', prochain: "M'asseoir avec quelqu'un que les autres méprisent", dieu: 'Prier humblement avec le chapelet (50 grains) "Mon Dieu, prends pitié du pécheur que je suis"' } },
        { date: 'Dimanche 15 mars', title: 'Dimanche — PAS DE JEÛNE', readings: '', actions: { soi: 'Repos liturgique / Messe dominicale', prochain: '—', dieu: '—' } },
      ],
    },
    {
      title: 'Semaine 5 de Carême', range: '16–21 mars',
      days: [
        { date: 'Lundi 16 mars', readings: 'Is 65,17-21 / Ps 29 / Jn 4,43-54', actions: { soi: "Croire en une promesse de Dieu que je n'ai pas encore vue", prochain: "Prier intensément pour la guérison d'un malade", dieu: 'Participer à la messe en semaine' } },
        { date: 'Mardi 17 mars', readings: 'Ez 47,1-9.12 / Ps 45 / Jn 5,1-16', actions: { soi: 'Identifier mes paralysies spirituelles et prendre des résolutions', prochain: 'Aider concrètement quelqu\'un de "paralysé" dans sa vie', dieu: 'Me renouveler dans mes promesses baptismales' } },
        { date: 'Mercredi 18 mars', readings: 'Is 49,8-15 / Ps 144 / Jn 5,17-30', actions: { soi: "Imiter une vertu que j'admire chez quelqu'un", prochain: 'Être un modèle positif pour un jeune', dieu: 'Méditer sur ma relation filiale avec le Père' } },
        { date: 'Jeudi 19 mars', title: 'Saint Joseph', readings: '2 S 7,4-5a.12-14a.16 / Ps 88 / Rm 4,13.16-18.22 / Mt 1,16.18-21.24a', actions: { soi: 'Faire mon travail avec excellence comme Joseph', prochain: 'Protéger et défendre la dignité de ma famille', dieu: 'Consacrer à Dieu par saint Joseph en faisant la litanie à saint Joseph' } },
        { date: 'Vendredi 20 mars', readings: 'Sg 2,1a.12-22 / Ps 33 / Jn 7,1-2.10.25-30', actions: { soi: "Accepter d'être incompris pour ma foi", prochain: "Soutenir quelqu'un persécuté pour sa foi", dieu: 'Chemin de Croix complet' } },
        { date: 'Samedi 21 mars', readings: 'Jr 11,18-20 / Ps 7 / Jn 7,40-53', actions: { soi: "Affirmer clairement ma foi malgré l'opposition", prochain: 'Évangéliser une personne par mon témoignage', dieu: "Prier pour l'unité de l'Église" } },
        { date: 'Dimanche 22 mars', title: 'Dimanche — PAS DE JEÛNE', readings: '', actions: { soi: 'Repos liturgique / Messe dominicale', prochain: '—', dieu: '—' } },
      ],
    },
    {
      title: 'Semaine 6 de Carême', range: '23–28 mars',
      days: [
        { date: 'Lundi 23 mars', readings: 'Dn 13,1-9.15-17.19-30.33-62 / Ps 22 / Jn 8,1-11', actions: { soi: 'Ne pas me condamner moi-même pour mes fautes passées', prochain: 'Refuser de participer à un commérage ou jugement', dieu: 'Accueillir la parole "Va, et ne pèche plus"' } },
        { date: 'Mardi 24 mars', readings: 'Nb 21,4-9 / Ps 101 / Jn 8,21-30', actions: { soi: 'Contempler un crucifix pendant 20 minutes ou adoration du Saint Sacrement', prochain: 'Offrir mes souffrances pour la conversion des pécheurs', dieu: 'Chapelet des mystères du jour (douloureux) et méditer sur la croix glorieuse' } },
        { date: 'Mercredi 25 mars', title: 'Annonciation', readings: 'Is 7,10-14 / Ps 39 / He 10,4-10 / Lc 1,26-38', actions: { soi: 'Dire "Oui" à une demande difficile de Dieu', prochain: "Visiter une femme enceinte et l'encourager", dieu: 'Chapelet du jour et réciter le Magnificat' } },
        { date: 'Jeudi 26 mars', readings: 'Gn 17,3-9 / Ps 104 / Jn 8,51-59', actions: { soi: 'Renouveler mon alliance baptismale par écrit', prochain: "Être fidèle à un engagement pris", dieu: "Adorer Jésus présent dans l'Eucharistie - 20 minutes" } },
        { date: 'Vendredi 27 mars', readings: 'Jr 20,10-13 / Ps 17 / Jn 10,31-42', actions: { soi: "Limiter mon temps sur les réseaux sociaux à 15 minutes aujourd'hui", prochain: 'Prier pour les chrétiens persécutés dans le monde', dieu: 'Chemin de Croix complet' } },
        { date: 'Samedi 28 mars', readings: 'Ez 37,21-28 / Jr 31 / Jn 11,45-56', actions: { soi: 'Préparer spirituellement mon entrée en Semaine Sainte', prochain: 'Réconcilier deux personnes en conflit', dieu: 'Adoration silencieuse de 20 minutes' } },
        { date: 'Dimanche 29 mars', title: 'Dimanche — PAS DE JEÛNE', readings: '', actions: { soi: 'Repos liturgique / Messe dominicale', prochain: '—', dieu: '—' } },
      ],
    },
    {
      title: 'Semaine Sainte', range: '30 mars – 4 avril',
      days: [
        { date: 'Lundi 30 mars', title: 'Lundi Saint', readings: 'Is 42,1-7 / Ps 26 / Jn 12,1-11', actions: { soi: "Compter toutes mes économies pour la visite à l'orphelinat du 4 avril", prochain: "Offrir un objet précieux à quelqu'un", dieu: 'Oindre les pieds du Christ en esprit' } },
        { date: 'Mardi 31 mars', title: 'Mardi Saint', readings: 'Is 49,1-6 / Ps 70 / Jn 13,21-33.36-38', actions: { soi: 'Confesser mes trahisons envers le Christ', prochain: "Pleurer avec quelqu'un qui souffre", dieu: 'Méditer sur la tristesse de Jésus' } },
        { date: 'Mercredi 1er avril', title: 'Mercredi Saint', readings: 'Is 50,4-9a / Ps 68 / Mt 26,14-25', actions: { soi: "Refuser toute malhonnêteté dans mes affaires aujourd'hui", prochain: 'Refuser tout compromis contraire aux valeurs chrétiennes', dieu: 'Demander la grâce de la fidélité absolue' } },
        { date: 'Jeudi 2 avril', title: 'Jeudi Saint', readings: 'Ex 12,1-8.11-14 / Ps 115 / 1 Co 11,23-26 / Jn 13,1-15', actions: { soi: "Jeûner complètement jusqu'à la messe du soir", prochain: "Laver réellement les pieds de quelqu'un", dieu: 'Participer à la messe du soir + Veiller en adoration' } },
        { date: 'Vendredi 3 avril', title: 'Vendredi Saint', readings: 'Is 52,13-53,12 / Ps 30 / He 4,14-16;5,7-9 / Jn 18,1-19,42', actions: { soi: 'Jeûne absolu (pain et eau uniquement si nécessaire)', prochain: "Porter une croix en silence pour quelqu'un", dieu: "Participer à l'Office de la Passion à 15h + Chemin de Croix complet" } },
        { date: 'Samedi 4 avril', title: 'Samedi Saint', readings: "Veillée pascale: 7 lectures de l'AT + Ps + Rm 6,3-11 / Mc 16,1-7", actions: { soi: 'Garder le silence complet autant que possible', prochain: 'GRANDE VISITE À L\'ORPHELINAT - Remettre tous les dons', dieu: 'Participer à la Veillée Pascale et revivre mon baptême' } },
        { date: 'Dimanche 5 avril', title: 'Pâques', readings: '', actions: { soi: 'Joie et gratitude', prochain: 'Partager un repas de fête', dieu: 'Participer à la messe de Pâques' } },
      ],
    },
  ],
};

const en: CaremeData = {
  fullProgram: [
    {
      title: 'Lent Week 1', range: 'Feb 18–22',
      days: [
        { date: 'Wednesday Feb 18', title: 'Ash Wednesday', readings: 'Joel 2:12-18 / Ps 51 / 2 Cor 5:20-6:2 / Mt 6:1-6,16-18', actions: { soi: "Make a thorough examination of conscience", prochain: "Ask forgiveness from someone I've hurt", dieu: "Attend Mass and receive ashes, make an act of contrition" } },
        { date: 'Thursday Feb 19', readings: 'Dt 30:15-20 / Ps 1 / Lk 9:22-25', actions: { soi: "Write my 3 definitive resolutions in a notebook", prochain: "Call a loved one I've neglected for a long time", dieu: "Meditate 15 minutes on the choice between life and death" } },
        { date: 'Friday Feb 20', readings: 'Is 58:1-9a / Ps 51 / Mt 9:14-15', actions: { soi: "Post no negative content on social media today", prochain: "Perform a corporal work of mercy", dieu: "Complete Stations of the Cross" } },
        { date: 'Saturday Feb 21', readings: 'Is 58:9b-14 / Ps 86 / Lk 5:27-32', actions: { soi: "Read the Gospel of the day and note a teaching", prochain: "Invite someone far from God to pray with me", dieu: "Pray for my conversion and that of sinners" } },
        { date: 'Sunday Feb 22', title: 'Sunday — NO FASTING', readings: '', actions: { soi: 'Liturgical rest / Sunday Mass', prochain: '—', dieu: '—' } },
      ],
    },
    {
      title: 'Lent Week 2', range: 'Feb 23–28',
      days: [
        { date: 'Monday Feb 23', readings: 'Lv 19:1-2,11-18 / Ps 19 / Mt 25:31-46', actions: { soi: "Fast from all complaining today", prochain: "Give money to a beggar", dieu: "Meditate on the Last Judgment and my works of charity" } },
        { date: 'Tuesday Feb 24', readings: 'Is 55:10-11 / Ps 34 / Mt 6:7-15', actions: { soi: 'Wake up 30 minutes earlier to pray', prochain: "Inwardly forgive someone who offended me", dieu: 'Copy the Our Father and meditate on each phrase' } },
        { date: 'Wednesday Feb 25', readings: 'Jon 3:1-10 / Ps 51 / Lk 11:29-32', actions: { soi: 'Identify my main sin and make a plan to fight it', prochain: "Write a letter of encouragement to someone", dieu: 'Read the book of Jonah in full' } },
        { date: 'Thursday Feb 26', readings: 'Est 14:1,3-5,12-14 / Ps 138 / Mt 7:7-12', actions: { soi: 'Make a list of 5 graces to ask of the Lord', prochain: "Serve someone without being asked", dieu: 'Pray insistently for my intentions' } },
        { date: 'Friday Feb 27', readings: 'Ez 18:21-28 / Ps 130 / Mt 5:20-26', actions: { soi: "Turn off my phone from 10 PM to 4 AM", prochain: "Go reconcile in person with someone", dieu: 'Complete Stations of the Cross' } },
        { date: 'Saturday Feb 28', readings: 'Dt 26:16-19 / Ps 119 / Mt 5:43-48', actions: { soi: 'Write the names of my "enemies" on a paper and keep it', prochain: "Do an act of kindness toward someone who hurt me", dieu: 'Pray for the conversion of my enemies' } },
        { date: 'Sunday Mar 1', title: 'Sunday — NO FASTING', readings: '', actions: { soi: 'Liturgical rest / Sunday Mass', prochain: '—', dieu: '—' } },
      ],
    },
    {
      title: 'Lent Week 3', range: 'Mar 2–7',
      days: [
        { date: 'Monday Mar 2', readings: 'Dn 9:4b-10 / Ps 79 / Lk 6:36-38', actions: { soi: 'Criticize no one all day', prochain: 'Donate clean unused clothes to a charity', dieu: 'Chaplet of Divine Mercy' } },
        { date: 'Tuesday Mar 3', readings: 'Is 1:10,16-20 / Ps 50 / Mt 23:1-12', actions: { soi: "Refuse all honors or compliments today", prochain: "Clean someone's house or serve them", dieu: "Meditate on the humility of Christ" } },
        { date: 'Wednesday Mar 4', readings: 'Jer 18:18-20 / Ps 31 / Mt 20:17-28', actions: { soi: 'Accept a setback without complaining', prochain: "Carry the groceries for an elderly person", dieu: "Read the Passion narrative in Matthew" } },
        { date: 'Thursday Mar 5', readings: 'Jer 17:5-10 / Ps 1 / Lk 16:19-31', actions: { soi: "Calculate how much I've saved for the orphanage visit on April 4", prochain: "Prepare or offer a meal for a person or family in need", dieu: 'Pray for the poor and hungry of the world' } },
        { date: 'Friday Mar 6', readings: 'Gn 37:3-4,12-13a,17b-28 / Ps 105 / Mt 21:33-43,45-46', actions: { soi: "Show love all day long", prochain: "Defend someone who is slandered", dieu: 'Complete Stations of the Cross' } },
        { date: 'Saturday Mar 7', readings: 'Mi 7:14-15,18-20 / Ps 103 / Lk 15:1-3,11-32', actions: { soi: 'Reread my resolutions and evaluate my faithfulness', prochain: "Warmly welcome someone I had rejected", dieu: 'Receive the sacrament of Reconciliation (go to confession)' } },
        { date: 'Sunday Mar 8', title: 'Sunday — NO FASTING', readings: '', actions: { soi: 'Liturgical rest / Sunday Mass', prochain: '—', dieu: '—' } },
      ],
    },
    {
      title: 'Lent Week 4', range: 'Mar 9–14',
      days: [
        { date: 'Monday Mar 9', readings: '2 Kgs 5:1-15a / Ps 42-43 / Lk 4:24-30', actions: { soi: "Obey a simple piece of advice I've always refused", prochain: "Publicly acknowledge someone's qualities", dieu: 'Give thanks for healings received' } },
        { date: 'Tuesday Mar 10', readings: 'Dn 3:25,34-43 / Ps 25 / Mt 18:21-35', actions: { soi: 'Burn the paper with my enemies\' names as a sign of forgiveness', prochain: "Call someone who hurt me to make peace", dieu: 'Meditate on my offenses against God' } },
        { date: 'Wednesday Mar 11', readings: 'Dt 4:1,5-9 / Ps 147 / Mt 5:17-19', actions: { soi: 'Reread the 10 Commandments and examine my life', prochain: 'Teach a truth of faith to a child', dieu: 'Read a Psalm and pray it slowly' } },
        { date: 'Thursday Mar 12', readings: 'Jer 7:23-28 / Ps 95 / Lk 11:14-23', actions: { soi: 'Spend 15 minutes in complete silence to listen to God', prochain: "Spiritually counsel someone who asks", dieu: "Read the Gospel of the day and note what God tells me" } },
        { date: 'Friday Mar 13', readings: 'Hos 14:2-10 / Ps 81 / Mk 12:28b-34', actions: { soi: 'Give up my favorite dish at dinner', prochain: "Visit a sick person at the hospital or at home", dieu: 'Complete Stations of the Cross' } },
        { date: 'Saturday Mar 14', readings: 'Hos 6:1-6 / Ps 51 / Lk 18:9-14', actions: { soi: 'Write down my main sins to confess them', prochain: "Sit with someone others despise", dieu: 'Pray humbly with the rosary (50 beads) "My God, have mercy on me, a sinner"' } },
        { date: 'Sunday Mar 15', title: 'Sunday — NO FASTING', readings: '', actions: { soi: 'Liturgical rest / Sunday Mass', prochain: '—', dieu: '—' } },
      ],
    },
    {
      title: 'Lent Week 5', range: 'Mar 16–21',
      days: [
        { date: 'Monday Mar 16', readings: 'Is 65:17-21 / Ps 30 / Jn 4:43-54', actions: { soi: "Believe in a promise of God I haven't yet seen fulfilled", prochain: "Pray intensely for the healing of a sick person", dieu: 'Attend weekday Mass' } },
        { date: 'Tuesday Mar 17', readings: 'Ez 47:1-9,12 / Ps 46 / Jn 5:1-16', actions: { soi: 'Identify my spiritual paralyses and make resolutions', prochain: 'Concretely help someone "paralyzed" in their life', dieu: 'Renew my baptismal promises' } },
        { date: 'Wednesday Mar 18', readings: 'Is 49:8-15 / Ps 145 / Jn 5:17-30', actions: { soi: "Imitate a virtue I admire in someone", prochain: 'Be a positive role model for a young person', dieu: 'Meditate on my filial relationship with the Father' } },
        { date: 'Thursday Mar 19', title: 'Saint Joseph', readings: '2 Sam 7:4-5a,12-14a,16 / Ps 89 / Rom 4:13,16-18,22 / Mt 1:16,18-21,24a', actions: { soi: 'Do my work with excellence like Joseph', prochain: 'Protect and defend the dignity of my family', dieu: 'Consecrate to God through Saint Joseph with the Litany of Saint Joseph' } },
        { date: 'Friday Mar 20', readings: 'Wis 2:1a,12-22 / Ps 34 / Jn 7:1-2,10,25-30', actions: { soi: "Accept being misunderstood for my faith", prochain: "Support someone persecuted for their faith", dieu: 'Complete Stations of the Cross' } },
        { date: 'Saturday Mar 21', readings: 'Jer 11:18-20 / Ps 7 / Jn 7:40-53', actions: { soi: "Clearly affirm my faith despite opposition", prochain: 'Evangelize someone through my testimony', dieu: "Pray for the unity of the Church" } },
        { date: 'Sunday Mar 22', title: 'Sunday — NO FASTING', readings: '', actions: { soi: 'Liturgical rest / Sunday Mass', prochain: '—', dieu: '—' } },
      ],
    },
    {
      title: 'Lent Week 6', range: 'Mar 23–28',
      days: [
        { date: 'Monday Mar 23', readings: 'Dn 13:1-9,15-17,19-30,33-62 / Ps 23 / Jn 8:1-11', actions: { soi: 'Do not condemn myself for past faults', prochain: 'Refuse to participate in gossip or judgment', dieu: 'Welcome the word "Go, and sin no more"' } },
        { date: 'Tuesday Mar 24', readings: 'Num 21:4-9 / Ps 102 / Jn 8:21-30', actions: { soi: 'Contemplate a crucifix for 20 minutes or adoration of the Blessed Sacrament', prochain: 'Offer my sufferings for the conversion of sinners', dieu: 'Rosary of the mysteries of the day (sorrowful) and meditate on the glorious cross' } },
        { date: 'Wednesday Mar 25', title: 'Annunciation', readings: 'Is 7:10-14 / Ps 40 / Heb 10:4-10 / Lk 1:26-38', actions: { soi: 'Say "Yes" to a difficult request from God', prochain: "Visit an expectant mother and encourage her", dieu: 'Rosary of the day and recite the Magnificat' } },
        { date: 'Thursday Mar 26', readings: 'Gn 17:3-9 / Ps 105 / Jn 8:51-59', actions: { soi: 'Renew my baptismal covenant in writing', prochain: "Be faithful to a commitment made", dieu: "Adore Jesus present in the Eucharist - 20 minutes" } },
        { date: 'Friday Mar 27', readings: 'Jer 20:10-13 / Ps 18 / Jn 10:31-42', actions: { soi: "Limit my social media time to 15 minutes today", prochain: 'Pray for persecuted Christians worldwide', dieu: 'Complete Stations of the Cross' } },
        { date: 'Saturday Mar 28', readings: 'Ez 37:21-28 / Jer 31 / Jn 11:45-56', actions: { soi: 'Spiritually prepare my entry into Holy Week', prochain: 'Reconcile two people in conflict', dieu: 'Silent adoration for 20 minutes' } },
        { date: 'Sunday Mar 29', title: 'Sunday — NO FASTING', readings: '', actions: { soi: 'Liturgical rest / Sunday Mass', prochain: '—', dieu: '—' } },
      ],
    },
    {
      title: 'Holy Week', range: 'Mar 30 – Apr 4',
      days: [
        { date: 'Monday Mar 30', title: 'Holy Monday', readings: 'Is 42:1-7 / Ps 27 / Jn 12:1-11', actions: { soi: "Count all my savings for the orphanage visit on April 4", prochain: "Offer a precious item to someone", dieu: "Anoint the feet of Christ in spirit" } },
        { date: 'Tuesday Mar 31', title: 'Holy Tuesday', readings: 'Is 49:1-6 / Ps 71 / Jn 13:21-33,36-38', actions: { soi: 'Confess my betrayals of Christ', prochain: "Weep with someone who is suffering", dieu: "Meditate on the sorrow of Jesus" } },
        { date: 'Wednesday Apr 1', title: 'Holy Wednesday', readings: 'Is 50:4-9a / Ps 69 / Mt 26:14-25', actions: { soi: "Refuse all dishonesty in my affairs today", prochain: 'Refuse any compromise against Christian values', dieu: 'Ask for the grace of absolute faithfulness' } },
        { date: 'Thursday Apr 2', title: 'Holy Thursday', readings: 'Ex 12:1-8,11-14 / Ps 116 / 1 Cor 11:23-26 / Jn 13:1-15', actions: { soi: "Fast completely until the evening Mass", prochain: "Actually wash someone's feet", dieu: 'Attend evening Mass + Keep vigil in adoration' } },
        { date: 'Friday Apr 3', title: 'Good Friday', readings: 'Is 52:13-53:12 / Ps 31 / Heb 4:14-16;5:7-9 / Jn 18:1-19:42', actions: { soi: 'Absolute fast (bread and water only if necessary)', prochain: "Carry a cross in silence for someone", dieu: "Attend the Office of the Passion at 3 PM + Complete Stations of the Cross" } },
        { date: 'Saturday Apr 4', title: 'Holy Saturday', readings: "Easter Vigil: 7 OT readings + Ps + Rom 6:3-11 / Mk 16:1-7", actions: { soi: 'Keep complete silence as much as possible', prochain: 'GREAT VISIT TO THE ORPHANAGE - Deliver all donations', dieu: 'Attend the Easter Vigil and relive my baptism' } },
        { date: 'Sunday Apr 5', title: 'Easter', readings: '', actions: { soi: 'Joy and gratitude', prochain: 'Share a festive meal', dieu: 'Attend Easter Mass' } },
      ],
    },
  ],
};

const it: CaremeData = {
  fullProgram: [
    {
      title: 'Settimana 1 di Quaresima', range: '18–22 febbraio',
      days: [
        { date: 'Mercoledì 18 febbraio', title: 'Mercoledì delle Ceneri', readings: 'Gl 2,12-18 / Sal 51 / 2 Cor 5,20-6,2 / Mt 6,1-6.16-18', actions: { soi: "Fare un esame di coscienza approfondito", prochain: "Chiedere perdono a una persona che ho ferito", dieu: "Partecipare alla Messa e ricevere le ceneri, fare un atto di contrizione" } },
        { date: 'Giovedì 19 febbraio', readings: 'Dt 30,15-20 / Sal 1 / Lc 9,22-25', actions: { soi: "Scrivere le mie 3 risoluzioni definitive in un quaderno", prochain: "Chiamare un caro che ho trascurato da tempo", dieu: "Meditare 15 minuti sulla scelta tra la vita e la morte" } },
        { date: 'Venerdì 20 febbraio', readings: 'Is 58,1-9a / Sal 51 / Mt 9,14-15', actions: { soi: "Non pubblicare contenuti negativi sui social oggi", prochain: "Fare un'opera di misericordia corporale", dieu: "Via Crucis completa" } },
        { date: 'Sabato 21 febbraio', readings: 'Is 58,9b-14 / Sal 86 / Lc 5,27-32', actions: { soi: "Leggere il Vangelo del giorno e annotare un insegnamento", prochain: "Invitare qualcuno lontano da Dio a pregare con me", dieu: "Pregare per la mia conversione e quella dei peccatori" } },
        { date: 'Domenica 22 febbraio', title: 'Domenica — NIENTE DIGIUNO', readings: '', actions: { soi: 'Riposo liturgico / Messa domenicale', prochain: '—', dieu: '—' } },
      ],
    },
    {
      title: 'Settimana 2 di Quaresima', range: '23–28 febbraio',
      days: [
        { date: 'Lunedì 23 febbraio', readings: 'Lv 19,1-2.11-18 / Sal 19 / Mt 25,31-46', actions: { soi: "Digiunare da ogni lamentela oggi", prochain: "Dare del denaro a un mendicante", dieu: "Meditare sul giudizio finale e le mie opere di carità" } },
        { date: 'Martedì 24 febbraio', readings: 'Is 55,10-11 / Sal 34 / Mt 6,7-15', actions: { soi: 'Alzarmi 30 minuti prima per pregare', prochain: "Perdonare interiormente qualcuno che mi ha offeso", dieu: 'Copiare il Padre Nostro e meditare ogni frase' } },
        { date: 'Mercoledì 25 febbraio', readings: 'Gn 3,1-10 / Sal 51 / Lc 11,29-32', actions: { soi: 'Identificare il mio peccato principale e fare un piano per combatterlo', prochain: "Scrivere una lettera di incoraggiamento a qualcuno", dieu: 'Leggere il libro di Giona per intero' } },
        { date: 'Giovedì 26 febbraio', readings: 'Est 14,1.3-5.12-14 / Sal 138 / Mt 7,7-12', actions: { soi: 'Fare una lista di 5 grazie da chiedere al Signore', prochain: "Rendere servizio a qualcuno senza che me lo chieda", dieu: 'Pregare con insistenza per le mie intenzioni' } },
        { date: 'Venerdì 27 febbraio', readings: 'Ez 18,21-28 / Sal 130 / Mt 5,20-26', actions: { soi: "Spegnere il telefono dalle 22 alle 4", prochain: "Andare a riconciliarmi di persona con qualcuno", dieu: 'Via Crucis completa' } },
        { date: 'Sabato 28 febbraio', readings: 'Dt 26,16-19 / Sal 119 / Mt 5,43-48', actions: { soi: 'Scrivere i nomi dei miei "nemici" su un foglio e conservarlo', prochain: "Fare un atto di bontà verso una persona che mi ha fatto del male", dieu: 'Pregare per la conversione dei miei nemici' } },
        { date: 'Domenica 1° marzo', title: 'Domenica — NIENTE DIGIUNO', readings: '', actions: { soi: 'Riposo liturgico / Messa domenicale', prochain: '—', dieu: '—' } },
      ],
    },
    {
      title: 'Settimana 3 di Quaresima', range: '2–7 marzo',
      days: [
        { date: 'Lunedì 2 marzo', readings: 'Dn 9,4b-10 / Sal 79 / Lc 6,36-38', actions: { soi: 'Non criticare nessuno per tutta la giornata', prochain: 'Donare vestiti puliti inutilizzati a un\'associazione', dieu: 'Coroncina della Divina Misericordia' } },
        { date: 'Martedì 3 marzo', readings: 'Is 1,10.16-20 / Sal 50 / Mt 23,1-12', actions: { soi: "Rifiutare ogni onore o complimento oggi", prochain: "Pulire la casa di qualcuno o rendergli servizio", dieu: "Meditare sull'umiltà di Cristo" } },
        { date: 'Mercoledì 4 marzo', readings: 'Ger 18,18-20 / Sal 31 / Mt 20,17-28', actions: { soi: 'Accettare una contrarietà senza lamentarmi', prochain: "Portare la spesa a una persona anziana", dieu: 'Leggere il racconto della Passione in Matteo' } },
        { date: 'Giovedì 5 marzo', readings: 'Ger 17,5-10 / Sal 1 / Lc 16,19-31', actions: { soi: "Calcolare quanto ho risparmiato per la visita all'orfanotrofio del 4 aprile", prochain: "Preparare o offrire un pasto a una persona o famiglia bisognosa", dieu: 'Pregare per i poveri e gli affamati del mondo' } },
        { date: 'Venerdì 6 marzo', readings: 'Gn 37,3-4.12-13a.17b-28 / Sal 105 / Mt 21,33-43.45-46', actions: { soi: "Manifestare amore per tutta la giornata", prochain: "Difendere qualcuno che viene calunniato", dieu: 'Via Crucis completa' } },
        { date: 'Sabato 7 marzo', readings: 'Mi 7,14-15.18-20 / Sal 103 / Lc 15,1-3.11-32', actions: { soi: 'Rileggere le mie risoluzioni e valutare la mia fedeltà', prochain: "Accogliere calorosamente qualcuno che avevo rifiutato", dieu: 'Ricevere il sacramento della Riconciliazione (confessarsi)' } },
        { date: 'Domenica 8 marzo', title: 'Domenica — NIENTE DIGIUNO', readings: '', actions: { soi: 'Riposo liturgico / Messa domenicale', prochain: '—', dieu: '—' } },
      ],
    },
    {
      title: 'Settimana 4 di Quaresima', range: '9–14 marzo',
      days: [
        { date: 'Lunedì 9 marzo', readings: '2 Re 5,1-15a / Sal 42-43 / Lc 4,24-30', actions: { soi: "Obbedire a un consiglio semplice che ho sempre rifiutato", prochain: "Riconoscere pubblicamente le qualità di qualcuno", dieu: 'Rendere grazie per le guarigioni ricevute' } },
        { date: 'Martedì 10 marzo', readings: 'Dn 3,25.34-43 / Sal 25 / Mt 18,21-35', actions: { soi: 'Bruciare il foglio con i nomi dei miei nemici come segno di perdono', prochain: "Telefonare a qualcuno che mi ha ferito per fare la pace", dieu: 'Meditare sulle mie offese verso Dio' } },
        { date: 'Mercoledì 11 marzo', readings: 'Dt 4,1.5-9 / Sal 147 / Mt 5,17-19', actions: { soi: 'Rileggere i 10 Comandamenti ed esaminare la mia vita', prochain: 'Insegnare una verità di fede a un bambino', dieu: 'Leggere un Salmo e pregarlo lentamente' } },
        { date: 'Giovedì 12 marzo', readings: 'Ger 7,23-28 / Sal 95 / Lc 11,14-23', actions: { soi: 'Trascorrere 15 minuti in silenzio totale per ascoltare Dio', prochain: "Consigliare spiritualmente qualcuno che me lo chiede", dieu: "Leggere il Vangelo del giorno e annotare ciò che Dio mi dice" } },
        { date: 'Venerdì 13 marzo', readings: 'Os 14,2-10 / Sal 81 / Mc 12,28b-34', actions: { soi: 'Rinunciare al mio piatto preferito a cena', prochain: "Visitare un malato in ospedale o a domicilio", dieu: 'Via Crucis completa' } },
        { date: 'Sabato 14 marzo', readings: 'Os 6,1-6 / Sal 51 / Lc 18,9-14', actions: { soi: 'Scrivere i miei principali peccati per confessarli', prochain: "Sedermi con qualcuno che gli altri disprezzano", dieu: 'Pregare umilmente con il rosario (50 grani) "Dio mio, abbi pietà del peccatore che sono"' } },
        { date: 'Domenica 15 marzo', title: 'Domenica — NIENTE DIGIUNO', readings: '', actions: { soi: 'Riposo liturgico / Messa domenicale', prochain: '—', dieu: '—' } },
      ],
    },
    {
      title: 'Settimana 5 di Quaresima', range: '16–21 marzo',
      days: [
        { date: 'Lunedì 16 marzo', readings: 'Is 65,17-21 / Sal 30 / Gv 4,43-54', actions: { soi: "Credere in una promessa di Dio che non ho ancora visto realizzata", prochain: "Pregare intensamente per la guarigione di un malato", dieu: 'Partecipare alla Messa feriale' } },
        { date: 'Martedì 17 marzo', readings: 'Ez 47,1-9.12 / Sal 46 / Gv 5,1-16', actions: { soi: 'Identificare le mie paralisi spirituali e prendere risoluzioni', prochain: 'Aiutare concretamente qualcuno "paralizzato" nella sua vita', dieu: 'Rinnovarmi nelle mie promesse battesimali' } },
        { date: 'Mercoledì 18 marzo', readings: 'Is 49,8-15 / Sal 145 / Gv 5,17-30', actions: { soi: "Imitare una virtù che ammiro in qualcuno", prochain: 'Essere un modello positivo per un giovane', dieu: 'Meditare sulla mia relazione filiale con il Padre' } },
        { date: 'Giovedì 19 marzo', title: 'San Giuseppe', readings: '2 Sam 7,4-5a.12-14a.16 / Sal 89 / Rm 4,13.16-18.22 / Mt 1,16.18-21.24a', actions: { soi: 'Fare il mio lavoro con eccellenza come Giuseppe', prochain: 'Proteggere e difendere la dignità della mia famiglia', dieu: 'Consacrarsi a Dio attraverso San Giuseppe con la litania a San Giuseppe' } },
        { date: 'Venerdì 20 marzo', readings: 'Sap 2,1a.12-22 / Sal 34 / Gv 7,1-2.10.25-30', actions: { soi: "Accettare di essere incompreso per la mia fede", prochain: "Sostenere qualcuno perseguitato per la sua fede", dieu: 'Via Crucis completa' } },
        { date: 'Sabato 21 marzo', readings: 'Ger 11,18-20 / Sal 7 / Gv 7,40-53', actions: { soi: "Affermare chiaramente la mia fede nonostante l'opposizione", prochain: 'Evangelizzare una persona con la mia testimonianza', dieu: "Pregare per l'unità della Chiesa" } },
        { date: 'Domenica 22 marzo', title: 'Domenica — NIENTE DIGIUNO', readings: '', actions: { soi: 'Riposo liturgico / Messa domenicale', prochain: '—', dieu: '—' } },
      ],
    },
    {
      title: 'Settimana 6 di Quaresima', range: '23–28 marzo',
      days: [
        { date: 'Lunedì 23 marzo', readings: 'Dn 13,1-9.15-17.19-30.33-62 / Sal 23 / Gv 8,1-11', actions: { soi: 'Non condannarmi per le colpe passate', prochain: 'Rifiutare di partecipare a pettegolezzi o giudizi', dieu: 'Accogliere la parola "Va\' e non peccare più"' } },
        { date: 'Martedì 24 marzo', readings: 'Nm 21,4-9 / Sal 102 / Gv 8,21-30', actions: { soi: 'Contemplare un crocifisso per 20 minuti o adorazione del Santissimo Sacramento', prochain: 'Offrire le mie sofferenze per la conversione dei peccatori', dieu: 'Rosario dei misteri del giorno (dolorosi) e meditare sulla croce gloriosa' } },
        { date: 'Mercoledì 25 marzo', title: 'Annunciazione', readings: 'Is 7,10-14 / Sal 40 / Eb 10,4-10 / Lc 1,26-38', actions: { soi: 'Dire "Sì" a una richiesta difficile di Dio', prochain: "Visitare una donna incinta e incoraggiarla", dieu: 'Rosario del giorno e recitare il Magnificat' } },
        { date: 'Giovedì 26 marzo', readings: 'Gn 17,3-9 / Sal 105 / Gv 8,51-59', actions: { soi: 'Rinnovare la mia alleanza battesimale per iscritto', prochain: "Essere fedele a un impegno preso", dieu: "Adorare Gesù presente nell'Eucaristia - 20 minuti" } },
        { date: 'Venerdì 27 marzo', readings: 'Ger 20,10-13 / Sal 18 / Gv 10,31-42', actions: { soi: "Limitare il mio tempo sui social a 15 minuti oggi", prochain: 'Pregare per i cristiani perseguitati nel mondo', dieu: 'Via Crucis completa' } },
        { date: 'Sabato 28 marzo', readings: 'Ez 37,21-28 / Ger 31 / Gv 11,45-56', actions: { soi: 'Prepararmi spiritualmente per l\'ingresso nella Settimana Santa', prochain: 'Riconciliare due persone in conflitto', dieu: 'Adorazione silenziosa di 20 minuti' } },
        { date: 'Domenica 29 marzo', title: 'Domenica — NIENTE DIGIUNO', readings: '', actions: { soi: 'Riposo liturgico / Messa domenicale', prochain: '—', dieu: '—' } },
      ],
    },
    {
      title: 'Settimana Santa', range: '30 marzo – 4 aprile',
      days: [
        { date: 'Lunedì 30 marzo', title: 'Lunedì Santo', readings: 'Is 42,1-7 / Sal 27 / Gv 12,1-11', actions: { soi: "Contare tutti i miei risparmi per la visita all'orfanotrofio del 4 aprile", prochain: "Offrire un oggetto prezioso a qualcuno", dieu: "Ungere i piedi di Cristo in spirito" } },
        { date: 'Martedì 31 marzo', title: 'Martedì Santo', readings: 'Is 49,1-6 / Sal 71 / Gv 13,21-33.36-38', actions: { soi: 'Confessare i miei tradimenti verso Cristo', prochain: "Piangere con qualcuno che soffre", dieu: "Meditare sulla tristezza di Gesù" } },
        { date: 'Mercoledì 1° aprile', title: 'Mercoledì Santo', readings: 'Is 50,4-9a / Sal 69 / Mt 26,14-25', actions: { soi: "Rifiutare ogni disonestà nei miei affari oggi", prochain: 'Rifiutare ogni compromesso contrario ai valori cristiani', dieu: 'Chiedere la grazia della fedeltà assoluta' } },
        { date: 'Giovedì 2 aprile', title: 'Giovedì Santo', readings: 'Es 12,1-8.11-14 / Sal 116 / 1 Cor 11,23-26 / Gv 13,1-15', actions: { soi: "Digiunare completamente fino alla Messa serale", prochain: "Lavare realmente i piedi a qualcuno", dieu: 'Partecipare alla Messa serale + Vegliare in adorazione' } },
        { date: 'Venerdì 3 aprile', title: 'Venerdì Santo', readings: 'Is 52,13-53,12 / Sal 31 / Eb 4,14-16;5,7-9 / Gv 18,1-19,42', actions: { soi: 'Digiuno assoluto (pane e acqua solo se necessario)', prochain: "Portare una croce in silenzio per qualcuno", dieu: "Partecipare all'Ufficio della Passione alle 15 + Via Crucis completa" } },
        { date: 'Sabato 4 aprile', title: 'Sabato Santo', readings: "Veglia pasquale: 7 letture dell'AT + Sal + Rm 6,3-11 / Mc 16,1-7", actions: { soi: 'Mantenere il silenzio completo il più possibile', prochain: "GRANDE VISITA ALL'ORFANOTROFIO - Consegnare tutte le donazioni", dieu: 'Partecipare alla Veglia Pasquale e rivivere il mio battesimo' } },
        { date: 'Domenica 5 aprile', title: 'Pasqua', readings: '', actions: { soi: 'Gioia e gratitudine', prochain: 'Condividere un pasto festivo', dieu: 'Partecipare alla Messa di Pasqua' } },
      ],
    },
  ],
};

const allData: Record<string, CaremeData> = { fr, en, it };

const normalizeLang = (lang: string) => (lang || 'fr').toLowerCase().split('-')[0];

export const getCaremeData = (lang: string): CaremeData => {
  const key = normalizeLang(lang);
  return allData[key] || fr;
};

// Keep backward compatibility
export const caremeData = fr;
