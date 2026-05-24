import { supabase } from '@/integrations/supabase/client';

async function createBroadcast(title: string, body: string, type: string = 'announcement') {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('broadcast_notifications').insert({
      title,
      body,
      type,
      target_role: 'all',
      created_by: user.id,
      is_sent: false,
    });
  } catch {
    // Silently ignore — FCM is best-effort
  }
}

export const notifyNewActivity = (title: string, description?: string) =>
  createBroadcast(
    `🎯 Nouvelle activité : ${title}`,
    description || 'Une nouvelle activité est disponible sur Voie Vérité Vie.',
    'announcement'
  );

export const notifyNewGallery = (title: string) =>
  createBroadcast(
    `🖼️ Nouvelle galerie : ${title}`,
    'De nouvelles photos ont été ajoutées dans la galerie.',
    'update'
  );

export const notifyNewNeuvaine = (title: string) =>
  createBroadcast(
    `🙏 Nouvelle neuvaine : ${title}`,
    'Une nouvelle neuvaine est disponible. Joignez-vous à la prière !',
    'reminder'
  );

export const notifyNewCareme = (day: number, title: string) =>
  createBroadcast(
    `✝️ Carême — Jour ${day} : ${title}`,
    'Un nouveau contenu de Carême est disponible.',
    'reminder'
  );

export const notifyNewDocument = (title: string) =>
  createBroadcast(
    `📄 Nouveau document : ${title}`,
    'Un nouveau document a été ajouté sur Voie Vérité Vie.',
    'announcement'
  );

export const notifyLiveStarting = (title: string) =>
  createBroadcast(
    `📺 Live en cours : ${title}`,
    'Un appel ou une diffusion en direct a commencé. Rejoignez-nous !',
    'announcement'
  );

export const notifyCustom = (title: string, body: string) =>
  createBroadcast(title, body, 'announcement');
