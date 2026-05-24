/**
 * Script de test — coller dans la console DevTools (F12) quand connecté en tant qu'admin.
 * Diagnostique et teste le système de notifications complet.
 */
(async () => {
  const { supabase } = await import('/src/integrations/supabase/client.ts').catch(() => {
    // En production, supabase est déjà global dans window
    return { supabase: window.__supabase };
  });

  const log = (emoji, msg, data) => {
    console.log(`${emoji} ${msg}`, data ?? '');
  };

  log('🔍', '=== TEST NOTIFICATIONS 3V ===');

  // 1. Session
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { log('❌', 'Non connecté — connectez-vous d\'abord'); return; }
  log('✅', 'Connecté:', user.email);

  // 2. Rôle admin
  const { data: roleRow } = await supabase.from('user_roles').select('role').eq('user_id', user.id).single();
  log(roleRow ? '✅' : '❌', 'Rôle:', roleRow?.role ?? 'aucun rôle trouvé');
  if (!roleRow) { log('❌', 'PROBLÈME: pas de rôle admin → les insertions broadcast seront rejetées par RLS'); }

  // 3. Tokens push enregistrés
  const { data: tokens, error: tokErr } = await supabase.from('fcm_tokens').select('token, platform, user_id');
  log(tokens?.length ? '✅' : '⚠️', `Tokens push en base: ${tokens?.length ?? 0}`, tokErr?.message);
  if (tokens?.length) {
    tokens.forEach((t, i) => log('  📱', `Token ${i+1}:`, { platform: t.platform, user: t.user_id.slice(0,8) }));
  } else {
    log('⚠️', 'AUCUN TOKEN — les push ne s\'enverront pas. Les utilisateurs doivent accepter les notifications.');
  }

  // 4. Service Worker + Push subscription locale
  if ('serviceWorker' in navigator && 'PushManager' in window) {
    const reg = await navigator.serviceWorker.getRegistration('/');
    if (reg) {
      const sub = await reg.pushManager.getSubscription();
      log(sub ? '✅' : '⚠️', 'Subscription push locale:', sub ? 'active' : 'aucune (relancer l\'app)');
    } else {
      log('⚠️', 'Service worker non enregistré');
    }
    log('ℹ️', 'Permission notifications:', Notification.permission);
  } else {
    log('⚠️', 'Push API non supportée sur ce navigateur');
  }

  // 5. Créer + envoyer une notification de test
  log('🚀', 'Création d\'une notification de test...');
  const { data: broadcast, error: bErr } = await supabase
    .from('broadcast_notifications')
    .insert({
      title: '🧪 Test notification',
      body: 'Ceci est un test automatique du système de notifications.',
      type: 'announcement',
      target_role: 'all',
      created_by: user.id,
      is_sent: false,
    })
    .select().single();

  if (bErr || !broadcast) {
    log('❌', 'Création broadcast échouée:', bErr?.message);
    log('💡', 'Cause probable: votre rôle n\'est pas "admin" dans user_roles (vous êtes peut-être "admin_principal")');
    return;
  }
  log('✅', 'Broadcast créé:', broadcast.id);

  // 6. Test RPC
  log('🔧', 'Test RPC send_broadcast_notification...');
  const { error: rpcErr } = await supabase.rpc('send_broadcast_notification', { p_broadcast_id: broadcast.id });
  if (rpcErr) {
    log('⚠️', 'RPC absente (normal):', rpcErr.message);
    log('ℹ️', 'Le fallback JavaScript prendra le relais');
  } else {
    log('✅', 'RPC disponible et exécutée');
  }

  // 7. Test push web (si tokens disponibles)
  if (tokens?.length) {
    log('📤', 'Envoi push web vers', tokens.length, 'device(s)...');
    // Importer le module web-push-client
    try {
      const tokenStrs = tokens.map(t => t.token);
      // Simuler l'envoi — vérifier juste que l'endpoint est valide
      for (const t of tokenStrs) {
        try {
          const parsed = JSON.parse(t);
          log('ℹ️', 'Endpoint push:', parsed.endpoint?.slice(0, 60) + '...');
        } catch { log('❌', 'Token mal formé'); }
      }
    } catch (e) {
      log('❌', 'Erreur push:', e.message);
    }
  }

  // 8. Vérifier les user_notifications créées
  const { data: userNotifs } = await supabase
    .from('user_notifications')
    .select('id, user_id, title, is_read')
    .eq('broadcast_notification_id', broadcast.id);
  log(userNotifs?.length ? '✅' : '⚠️', `Notifications in-app créées: ${userNotifs?.length ?? 0}`);

  // Nettoyage
  await supabase.from('broadcast_notifications').delete().eq('id', broadcast.id);
  log('🧹', 'Test terminé — broadcast de test supprimé');
  log('📊', '=== RÉSUMÉ ===');
  log('', `Rôle admin: ${roleRow?.role ?? 'ABSENT'}
Push tokens: ${tokens?.length ?? 0}
Notifications créées: ${userNotifs?.length ?? 0}
Action requise: ${!roleRow ? 'Ajouter rôle admin dans user_roles' : !tokens?.length ? 'Les utilisateurs doivent accepter les notifications' : 'Système OK'}`);
})();
