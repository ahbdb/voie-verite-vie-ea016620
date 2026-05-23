/**
 * Service de Prières Personnalisées
 * Envoie des prières basées sur les lectures bibliques du jour
 */

import { supabase } from '@/integrations/supabase/client';
import { broadcastNotificationService } from '@/hooks/useBroadcastNotifications';

/**
 * Envoyer une prière basée sur la lecture du jour
 */
export const sendDailyPrayer = async (userId?: string) => {
  try {
    // Récupérer la lecture biblique du jour
    const today = new Date();
    const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000);

    const { data: reading } = await (supabase as any)
      .from('biblical_readings')
      .select('title, chapter, verses, content')
      .eq('day_of_year', dayOfYear)
      .single();

    if (!reading) {
      // Fallback si pas de lecture trouvée
      await broadcastNotificationService.sendToAll(
        '🙏 Prière du Jour',
        'Seigneur, guide-moi aujourd\'hui sur le chemin de la lumière et de la paix.',
        'greeting',
        '🙏'
      );
      return;
    }

    // Créer une prière en fonction du contenu biblique
    const prayers = generatePrayerFromReading(reading);
    const randomPrayer = prayers[Math.floor(Math.random() * prayers.length)];

    await broadcastNotificationService.sendToAll(
      `🙏 Prière du Jour - ${reading.title}`,
      randomPrayer,
      'greeting',
      '🙏'
    );
  } catch (error) {
    console.error('Erreur lors de l\'envoi de la prière:', error);
  }
};

/**
 * Générer des prières adaptées à une lecture biblique
 */
function generatePrayerFromReading(reading: any): string[] {
  const prayers: string[] = [];

  // Prières génériques adaptées
  prayers.push(
    `Seigneur, aide-moi à méditer sur ${reading.title} aujourd'hui et à appliquer ces paroles dans ma vie.`,
    `Que la lecture d'aujourd'hui sur ${reading.title} transforme mon cœur et mon esprit.`,
    `Seigneur, donne-moi la sagesse pour comprendre ${reading.title} et de vivre selon ta volonté.`,
    `Je te confie ma journée. Que ${reading.title} soit ma lumière et mon guide.`,
    `Que ces versets de ${reading.title} me remplissent de paix, de joie et d'espérance.`
  );

  return prayers;
}

/**
 * Envoyer une prière du soir
 */
export const sendEveningPrayer = async () => {
  const eveningPrayers = [
    'Merci Seigneur pour cette journée. Je dépose mes soucis à tes pieds et te confie ma nuit.',
    'En cette fin de jour, je te rends grâce pour tes bénédictions. Accorde-moi un repos réparateur.',
    'Seigneur, pardonne-moi mes erreurs d\'aujourd\'hui. Que ta paix habite en moi cette nuit.',
    'Je confie ma vie à toi avant de dormir. Veille sur moi et sur mes proches.',
    'Que la lumière de ta présence m\'accompagne durant mon sommeil. Amen.'
  ];

  const randomPrayer = eveningPrayers[Math.floor(Math.random() * eveningPrayers.length)];

  await broadcastNotificationService.sendToAll(
    '🌙 Prière du Soir',
    randomPrayer,
    'greeting',
    '🌙'
  );
};

/**
 * Envoyer une prière de midi
 */
export const sendMidDayPrayer = async () => {
  const midDayPrayers = [
    'À midi, je prends un moment pour te prier. Donne-moi la force de continuer cette journée avec confiance.',
    'Seigneur, à la moitié de ma journée, je me reconnecte à toi. Renforce-moi et guide mes pas.',
    'Dans ce moment de pause, je te confie le reste de ma journée. Sois mon refuge et ma force.',
    'À midi, je t\'élève une prière de gratitude pour tout ce que tu fais dans ma vie.',
    'Seigneur, que ce moment me ramène à toi et à ce qui est essentiel.'
  ];

  const randomPrayer = midDayPrayers[Math.floor(Math.random() * midDayPrayers.length)];

  await broadcastNotificationService.sendToAll(
    '☀️ Prière de Midi',
    randomPrayer,
    'greeting',
    '☀️'
  );
};
