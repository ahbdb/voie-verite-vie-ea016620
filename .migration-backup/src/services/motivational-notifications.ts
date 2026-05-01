/**
 * Service de Messages Motivationnels et Spéciaux
 * Messages d'amour, punch, anniversaires, promotions
 */

import { broadcastNotificationService } from '@/hooks/useBroadcastNotifications';

/**
 * Messages d'amour et d'encouragement
 */
export const loveMessages = [
  { title: '💖 Un Peu d\'Amour', message: 'Tu es précieux(se) et tu comptes vraiment. Que ta journée soit remplie d\'amour et de bénédictions.' },
  { title: '💝 Pensée du Jour', message: 'Que tu saches que quelqu\'un pense à toi aujourd\'hui. Tu fais une différence dans ce monde.' },
  { title: '🌟 Tu es Spécial(e)', message: 'Souviens-toi que tu es aimé(e), tu es important(e), tu es unique(e). Brille de ta propre lumière!' },
  { title: '💫 Message d\'Espoir', message: 'Même dans les moments difficiles, tu n\'es pas seul(e). L\'amour et la compassion t\'entourent.' },
  { title: '🙏 Bénédiction du Jour', message: 'Que la paix envahisse ton cœur, que l\'amour guide tes pas et que la joie illumine ton chemin.' },
  { title: '💖 Tu Mérites', message: 'Tu mérites du bonheur, du respect et de l\'amour. Sois bon(ne) envers toi-même aujourd\'hui.' },
  { title: '✨ Scintille', message: 'Ton âme brille d\'une lumière unique. Partage cette lumière avec le monde!' },
  { title: '🌈 Arc-en-Ciel', message: 'Après la tempête vient l\'arc-en-ciel. Tes jours meilleurs approchent. Crois et persévère.' },
];

/**
 * Messages "Punch" - Motivationnels et Énergisants
 */
export const punchMessages = [
  { title: '💪 Allez Go!', message: 'Tu as ceci! Fonce et montre au monde ce dont tu es capable. C\'est ton jour!' },
  { title: '🔥 Motivation du Jour', message: 'Réveille-toi! C\'est le moment de briller. Conquiers ta journée avec puissance et confiance!' },
  { title: '⚡ Énergie Positive', message: 'Tu es plus fort(e) que tu le penses. Relève ce défi et fais l\'impossible!' },
  { title: '🚀 Décolle!', message: 'Ton potentiel est illimité. Aujourd\'hui est le jour où tu te dépasses. Vas-y!' },
  { title: '🏆 Champion(ne)', message: 'Tu es un(e) champion(ne)! Agis comme tel. Rien ne t\'arrête si tu y crois!' },
  { title: '💥 Explosive', message: 'C\'est l\'heure! L\'univers attend tes contributions. Sois le changement que tu veux voir!' },
  { title: '🎯 Focus', message: 'Concentre-toi sur tes objectifs. Chaque petit pas te rapproche de ta victoire. Avance!' },
  { title: '⭐ Brillant(e)', message: 'Tu as le pouvoir de changer ta vie. Commence maintenant. Ne remets pas à demain. FAIS-LE!' },
];

/**
 * Messages d'Anniversaire
 */
export const birthdayMessages = [
  'Joyeux Anniversaire! Que cette année soit remplie de joie, de santé et de succès. Tu es un(e) cadeau pour ce monde!',
  'Happy Birthday! Aujourd\'hui c\'est ton jour spécial. Que chaque moment soit magique et que tes rêves se réalisent!',
  'Un an de plus, un an de sagesse en plus. Célèbre toi-même car tu le mérites vraiment!',
  'Joyeux Anniversaire à toi! Que ton cœur soit constellé de rires, de souvenirs heureux et de moments précieux.',
  'C\'est ta journée! Profite, célèbre et sois heureux(se). Tu es aimé(e) plus que tu ne le sais!',
  'Anniversaire merveilleux! Que l\'année nouvelle t\'apporte amour, paix et accomplissement de tous tes rêves.',
];

/**
 * Messages de Promotion de l\'Application
 */
export const promotionMessages = [
  { title: '📱 Découvrez la Communauté', message: 'Rejoins notre belle communauté spirituelle! Partage tes prières, tes pensées et trouve du soutien. Ensemble, nous sommes plus forts!' },
  { title: '🌟 Nouvelles Fonctionnalités', message: 'Explore les nouvelles lectures bibliques et les méditations guidées. Ton voyage spirituel t\'attend!' },
  { title: '🙏 Forum Prière', message: 'As-tu une intention de prière? Partage-la dans notre forum et laisse la communauté prier avec toi!' },
  { title: '📖 Carême 2026', message: 'Le Carême 2026 a commencé! Accompagne-toi avec nos lectures bibliques quotidiennes pour une expérience spirituelle riche.' },
  { title: '✝️ Chemin de Croix', message: 'Médite sur le Chemin de Croix. 14 stations pour te rapprocher du Christ et de la rédemption.' },
  { title: '🎬 Partage Cette App!', message: 'Voie Vérité Vie a aidé beaucoup de gens. Partage cette application avec tes proches et grandissons ensemble!' },
  { title: '🌍 Communion Mondiale', message: 'Connecte-toi avec des croyants du monde entier. Prie ensemble, partage ta foi et inspire les autres.' },
  { title: '⭐ Évaluation 5 Étoiles?', message: 'Si cette app t\'a aidé(e), laisse-nous une évaluation 5 étoiles! Cela nous aide à aider encore plus de gens.' },
];

/**
 * Envoyer un message d'amour aléatoire
 */
export const sendLoveMessage = async () => {
  const msg = loveMessages[Math.floor(Math.random() * loveMessages.length)];
  await broadcastNotificationService.sendToAll(msg.title, msg.message, 'greeting', '💖');
};

/**
 * Envoyer un message de punch aléatoire
 */
export const sendPunchMessage = async () => {
  const msg = punchMessages[Math.floor(Math.random() * punchMessages.length)];
  await broadcastNotificationService.sendToAll(msg.title, msg.message, 'reminder', '💪');
};

/**
 * Envoyer un message d'anniversaire
 */
export const sendBirthdayMessage = async (userName?: string) => {
  const msg = birthdayMessages[Math.floor(Math.random() * birthdayMessages.length)];
  const title = userName ? `🎉 Joyeux Anniversaire ${userName}!` : '🎉 Joyeux Anniversaire!';
  
  await broadcastNotificationService.sendToAll(title, msg, 'greeting', '🎉');
};

/**
 * Envoyer un message de promotion
 */
export const sendPromotionMessage = async () => {
  const msg = promotionMessages[Math.floor(Math.random() * promotionMessages.length)];
  await broadcastNotificationService.sendToAll(msg.title, msg.message, 'announcement', '📱');
};

/**
 * Envoyer une série de messages motivationnels
 */
export const startMotivationalCycle = async () => {
  // Chaque jour, envoyer un message d'amour le matin
  const morningLoveSchedule = '08:00'; // 8h du matin
  
  // Puis un message de punch en fin de matin
  const punchSchedule = '11:00'; // 11h du matin
  
  // Une prière le midi
  const noonPrayerSchedule = '12:30'; // 12h30
  
  // Un message de promotion l'après-midi
  const afternoonPromotionSchedule = '15:00'; // 15h
  
  // Une prière le soir
  const eveningPrayerSchedule = '20:00'; // 20h
  
  console.log('✓ Cycles de messages motivationnels configurés');
  console.log(`  📝 Message d'amour: ${morningLoveSchedule}`);
  console.log(`  💪 Message punch: ${punchSchedule}`);
  console.log(`  🙏 Prière midi: ${noonPrayerSchedule}`);
  console.log(`  📱 Promotion: ${afternoonPromotionSchedule}`);
  console.log(`  🌙 Prière soir: ${eveningPrayerSchedule}`);
};
