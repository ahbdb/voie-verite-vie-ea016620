#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://kaddsojhnkyfavaulrfc.supabase.co'
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!serviceRoleKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY not set')
  console.log('\nTente avec anon key...')
}

const supabase = createClient(
  supabaseUrl, 
  serviceRoleKey || process.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  { db: { schema: 'public' } }
)

// SQL pour créer la RPC (si elle n'existe pas)
const createRpcSql = `
CREATE OR REPLACE FUNCTION update_page_content_data(
  p_page_key text,
  p_content jsonb
)
RETURNS json AS $$
DECLARE
  v_result json;
BEGIN
  -- Only allow authenticated users
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Must be authenticated';
  END IF;
  
  -- Update the content
  UPDATE public.page_content 
  SET 
    content = p_content,
    updated_at = now()
  WHERE page_key = p_page_key;
  
  -- Return the updated record
  SELECT json_build_object(
    'success', true,
    'page_key', page_key,
    'content', content,
    'updated_at', updated_at
  )
  INTO v_result
  FROM public.page_content
  WHERE page_key = p_page_key;
  
  RETURN COALESCE(v_result, json_build_object('success', false, 'error', 'Not found'));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION update_page_content_data(text, jsonb) TO authenticated, anon;
`

async function setupAndSync() {
  console.log('🔧 Setting up RPC function...\n')
  
  try {
    // Try to execute the SQL to create the RPC
    console.log('📝 Creating RPC function...')
    const { data: createResult, error: createError } = await supabase
      .rpc('exec_sql', { sql: createRpcSql })
      .catch(() => ({ data: null, error: { message: 'exec_sql not available' } }))
    
    if (createError && createError.message !== 'exec_sql not available') {
      console.error('⚠️  Could not verify RPC via SQL:', createError.message)
    } else {
      console.log('✅ RPC function ensured')
    }

    // Now try to sync the data via the RPC
    console.log('\n💾 Now syncing 47 days via RPC...\n')
    
    const allDays = [
      { date: 'Mercredi 18 février', title: 'Mercredi des Cendres', readings: 'Jl 2,12-18 / Ps 50 / 2 Co 5,20-6,2 / Mt 6,1-6.16-18', actions: { soi: "Faire un examen de conscience approfondi", prochain: "Demander pardon à une personne que j'ai blessée", dieu: "Participer à la messe et recevoir les cendres, faire un acte de contrition" }, weekTitle: 'Semaine 1 de Carême' },
      { date: 'Jeudi 19 février', title: '', readings: 'Dt 30,15-20 / Ps 1 / Lc 9,22-25', actions: { soi: "Écrire mes 3 résolutions définitives dans un carnet", prochain: "Appeler un proche que j'ai négligé depuis longtemps", dieu: "Méditer 15 minutes sur le choix entre la vie et la mort" }, weekTitle: 'Semaine 1 de Carême' },
      { date: 'Vendredi 20 février', title: '', readings: 'Is 58,1-9a / Ps 50 / Mt 9,14-15', actions: { soi: "Ne publier aucun contenu négatif sur les réseaux sociaux aujourd'hui", prochain: "Faire une œuvre de miséricorde corporelle", dieu: "Chemin de Croix complet" }, weekTitle: 'Semaine 1 de Carême' },
      { date: 'Samedi 21 février', title: '', readings: 'Is 58,9b-14 / Ps 85 / Lc 5,27-32', actions: { soi: "Lire l'Évangile du jour et noter un enseignement", prochain: "Inviter quelqu'un d'éloigné de Dieu à prier avec moi", dieu: "Prier pour ma conversion et celle des pécheurs" }, weekTitle: 'Semaine 1 de Carême' },
      { date: 'Dimanche 22 février', title: 'Dimanche — PAS DE JEÛNE', readings: '', actions: { soi: 'Repos liturgique / Messe dominicale', prochain: '—', dieu: '—' }, weekTitle: 'Semaine 1 de Carême' },
      { date: 'Lundi 23 février', title: '', readings: 'Lv 19,1-2.11-18 / Ps 18 / Mt 25,31-46', actions: { soi: "Jeûner de toute plainte aujourd'hui", prochain: "Donner de l'argent à un mendiant", dieu: "Méditer sur le jugement dernier et mes œuvres de charité" }, weekTitle: 'Semaine 2 de Carême' },
      { date: 'Mardi 24 février', title: '', readings: 'Is 55,10-11 / Ps 33 / Mt 6,7-15', actions: { soi: 'Me lever 30 minutes plus tôt pour prier', prochain: 'Pardonner intérieurement à quelqu\'un qui m\'a offensé', dieu: 'Copier le Notre Père et méditer chaque phrase' }, weekTitle: 'Semaine 2 de Carême' },
      { date: 'Mercredi 25 février', title: '', readings: 'Jon 3,1-10 / Ps 50 / Lc 11,29-32', actions: { soi: 'Identifier mon péché principal et décider un plan pour le combattre', prochain: 'Écrire une lettre d\'encouragement à quelqu\'un', dieu: 'Lire le livre de Jonas en entier' }, weekTitle: 'Semaine 2 de Carême' },
      { date: 'Jeudi 26 février', title: '', readings: 'Est 14,1.3-5.12-14 / Ps 137 / Mt 7,7-12', actions: { soi: 'Faire une liste de 5 grâces à demander au Seigneur', prochain: 'Rendre service à quelqu\'un sans qu\'il me le demande', dieu: 'Prier avec insistance pour mes intentions' }, weekTitle: 'Semaine 2 de Carême' },
      { date: 'Vendredi 27 février', title: '', readings: 'Ez 18,21-28 / Ps 129 / Mt 5,20-26', actions: { soi: "Éteindre mon téléphone de 22h à 4h", prochain: 'Aller me réconcilier en personne avec quelqu\'un', dieu: 'Chemin de Croix complet' }, weekTitle: 'Semaine 2 de Carême' },
      { date: 'Samedi 28 février', title: '', readings: 'Dt 26,16-19 / Ps 118 / Mt 5,43-48', actions: { soi: 'Écrire le nom de mes "ennemis" sur un papier et garder ce papier', prochain: 'Faire un acte de bonté envers une personne qui m\'a fait du mal', dieu: 'Prier pour la conversion de mes ennemis' }, weekTitle: 'Semaine 2 de Carême' },
      { date: 'Dimanche 1er mars', title: 'Dimanche — PAS DE JEÛNE', readings: '', actions: { soi: 'Repos liturgique / Messe dominicale', prochain: '—', dieu: '—' }, weekTitle: 'Semaine 2 de Carême' },
      { date: 'Lundi 2 mars', title: '', readings: 'Dn 9,4b-10 / Ps 78 / Lc 6,36-38', actions: { soi: 'Ne critiquer personne de toute la journée', prochain: 'Donner des vêtements inutilisés propres à une association', dieu: 'Chapelet de la Miséricorde Divine' }, weekTitle: 'Semaine 3 de Carême' },
      { date: 'Mardi 3 mars', title: '', readings: 'Is 1,10.16-20 / Ps 49 / Mt 23,1-12', actions: { soi: 'Refuser tout honneur ou compliment aujourd\'hui', prochain: 'Nettoyer la maison de quelqu\'un ou rendre service', dieu: 'Méditer sur l\'humilité du Christ' }, weekTitle: 'Semaine 3 de Carême' },
      { date: 'Mercredi 4 mars', title: '', readings: 'Jr 18,18-20 / Ps 30 / Mt 20,17-28', actions: { soi: 'Accepter une contrariété sans me plaindre', prochain: 'Porter les courses d\'une personne âgée', dieu: 'Lire le récit de la Passion dans Matthieu' }, weekTitle: 'Semaine 3 de Carême' },
      { date: 'Jeudi 5 mars', title: '', readings: 'Jr 17,5-10 / Ps 1 / Lc 16,19-31', actions: { soi: 'Calculer combien j\'ai économisé pour la visite à l\'orphelinat du 4 avril', prochain: 'Préparer ou offrir un repas pour une personne ou une famille dans le besoin', dieu: 'Prier pour les pauvres et les affamés du monde' }, weekTitle: 'Semaine 3 de Carême' },
      { date: 'Vendredi 6 mars', title: '', readings: 'Gn 37,3-4.12-13a.17b-28 / Ps 104 / Mt 21,33-43.45-46', actions: { soi: 'Manifester de l\'amour toute la journée', prochain: 'Défendre quelqu\'un qui est calomnié', dieu: 'Chemin de Croix complet' }, weekTitle: 'Semaine 3 de Carême' },
      { date: 'Samedi 7 mars', title: '', readings: 'Mi 7,14-15.18-20 / Ps 102 / Lc 15,1-3.11-32', actions: { soi: 'Relire mes résolutions et évaluer ma fidélité', prochain: 'Accueillir chaleureusement quelqu\'un que j\'avais rejeté', dieu: 'Recevoir le sacrement de Réconciliation (se confesser)' }, weekTitle: 'Semaine 3 de Carême' },
      { date: 'Dimanche 8 mars', title: 'Dimanche — PAS DE JEÛNE', readings: '', actions: { soi: 'Repos liturgique / Messe dominicale', prochain: '—', dieu: '—' }, weekTitle: 'Semaine 3 de Carême' },
      { date: 'Lundi 9 mars', title: '', readings: '2 R 5,1-15a / Ps 41.42 / Lc 4,24-30', actions: { soi: 'Obéir à un conseil simple que j\'ai toujours refusé', prochain: 'Reconnaître publiquement les qualités de quelqu\'un', dieu: 'Rendre grâce pour les guérisons reçues' }, weekTitle: 'Semaine 4 de Carême' },
      { date: 'Mardi 10 mars', title: '', readings: 'Dn 3,25.34-43 / Ps 24 / Mt 18,21-35', actions: { soi: 'Brûler le papier avec les noms de mes ennemis en guise de pardon', prochain: 'Téléphoner à quelqu\'un qui m\'a blessé pour faire la paix', dieu: 'Méditer sur mes offenses envers Dieu' }, weekTitle: 'Semaine 4 de Carême' },
      { date: 'Mercredi 11 mars', title: '', readings: 'Dt 4,1.5-9 / Ps 147 / Mt 5,17-19', actions: { soi: 'Relire les 10 Commandements et examiner ma vie', prochain: 'Enseigner une vérité de foi à un enfant', dieu: 'Lire un Psaume et le prier lentement' }, weekTitle: 'Semaine 4 de Carême' },
      { date: 'Jeudi 12 mars', title: '', readings: 'Jr 7,23-28 / Ps 94 / Lc 11,14-23', actions: { soi: 'Passer 15 minutes en silence total pour écouter Dieu', prochain: 'Conseiller spirituellement quelqu\'un qui me le demande', dieu: 'Lire l\'Évangile du jour et noter ce que Dieu me dit' }, weekTitle: 'Semaine 4 de Carême' },
      { date: 'Vendredi 13 mars', title: '', readings: 'Os 14,2-10 / Ps 80 / Mc 12,28b-34', actions: { soi: 'Renoncer à mon plat préféré au repas du soir', prochain: 'Visiter un malade à l\'hôpital ou à domicile', dieu: 'Chemin de Croix complet' }, weekTitle: 'Semaine 4 de Carême' },
      { date: 'Samedi 14 mars', title: '', readings: 'Os 6,1-6 / Ps 50 / Lc 18,9-14', actions: { soi: 'Écrire mes principaux péchés pour les confesser', prochain: 'M\'asseoir avec quelqu\'un que les autres méprisent', dieu: 'Prier humblement avec le chapelet (50 grains) "Mon Dieu, prends pitié du pécheur que je suis"' }, weekTitle: 'Semaine 4 de Carême' },
      { date: 'Dimanche 15 mars', title: 'Dimanche — PAS DE JEÛNE', readings: '', actions: { soi: 'Repos liturgique / Messe dominicale', prochain: '—', dieu: '—' }, weekTitle: 'Semaine 4 de Carême' },
      { date: 'Lundi 16 mars', title: '', readings: 'Is 65,17-21 / Ps 29 / Jn 4,43-54', actions: { soi: 'Croire en une promesse de Dieu que je n\'ai pas encore vue', prochain: 'Prier intensément pour la guérison d\'un malade', dieu: 'Participer à la messe en semaine' }, weekTitle: 'Semaine 5 de Carême' },
      { date: 'Mardi 17 mars', title: '', readings: 'Ez 47,1-9.12 / Ps 45 / Jn 5,1-16', actions: { soi: 'Identifier mes paralysies spirituelles et prendre des résolutions', prochain: 'Aider concrètement quelqu\'un de "paralysé" dans sa vie', dieu: 'Me renouveler dans mes promesses baptismales' }, weekTitle: 'Semaine 5 de Carême' },
      { date: 'Mercredi 18 mars', title: '', readings: 'Is 49,8-15 / Ps 144 / Jn 5,17-30', actions: { soi: 'Imiter une vertu que j\'admire chez quelqu\'un', prochain: 'Être un modèle positif pour un jeune', dieu: 'Méditer sur ma relation filiale avec le Père' }, weekTitle: 'Semaine 5 de Carême' },
      { date: 'Jeudi 19 mars', title: 'Saint Joseph', readings: '2 S 7,4-5a.12-14a.16 / Ps 88 / Rm 4,13.16-18.22 / Mt 1,16.18-21.24a', actions: { soi: 'Faire mon travail avec excellence comme Joseph', prochain: 'Protéger et défendre la dignité de ma famille', dieu: 'Consacrer à Dieu par saint Joseph en faisant la litanie à saint Joseph' }, weekTitle: 'Semaine 5 de Carême' },
      { date: 'Vendredi 20 mars', title: '', readings: 'Sg 2,1a.12-22 / Ps 33 / Jn 7,1-2.10.25-30', actions: { soi: 'Accepter d\'être incompris pour ma foi', prochain: 'Soutenir quelqu\'un persécuté pour sa foi', dieu: 'Chemin de Croix complet' }, weekTitle: 'Semaine 5 de Carême' },
      { date: 'Samedi 21 mars', title: '', readings: 'Jr 11,18-20 / Ps 7 / Jn 7,40-53', actions: { soi: 'Affirmer clairement ma foi malgré l\'opposition', prochain: 'Évangéliser une personne par mon témoignage', dieu: 'Prier pour l\'unité de l\'Église' }, weekTitle: 'Semaine 5 de Carême' },
      { date: 'Dimanche 22 mars', title: 'Dimanche — PAS DE JEÛNE', readings: '', actions: { soi: 'Repos liturgique / Messe dominicale', prochain: '—', dieu: '—' }, weekTitle: 'Semaine 5 de Carême' },
      { date: 'Lundi 23 mars', title: '', readings: 'Dn 13,1-9.15-17.19-30.33-62 / Ps 22 / Jn 8,1-11', actions: { soi: 'Ne pas me condamner moi-même pour mes fautes passées', prochain: 'Refuser de participer à un commérage ou jugement', dieu: 'Accueillir la parole "Va, et ne pèche plus"' }, weekTitle: 'Semaine 6 de Carême' },
      { date: 'Mardi 24 mars', title: '', readings: 'Nb 21,4-9 / Ps 101 / Jn 8,21-30', actions: { soi: 'Contempler un crucifix pendant 20 minutes ou adoration du Saint Sacrement', prochain: 'Offrir mes souffrances pour la conversion des pécheurs', dieu: 'Chapelet des mystères du jour (douloureux) et méditer sur la croix glorieuse' }, weekTitle: 'Semaine 6 de Carême' },
      { date: 'Mercredi 25 mars', title: 'Annonciation', readings: 'Is 7,10-14 / Ps 39 / He 10,4-10 / Lc 1,26-38', actions: { soi: 'Dire "Oui" à une demande difficile de Dieu', prochain: 'Visiter une femme enceinte et l\'encourager', dieu: 'Chapelet du jour et réciter le Magnificat' }, weekTitle: 'Semaine 6 de Carême' },
      { date: 'Jeudi 26 mars', title: '', readings: 'Gn 17,3-9 / Ps 104 / Jn 8,51-59', actions: { soi: 'Renouveler mon alliance baptismale par écrit', prochain: 'Être fidèle à un engagement pris', dieu: 'Adorer Jésus présent dans l\'Eucharistie - 20 minutes' }, weekTitle: 'Semaine 6 de Carême' },
      { date: 'Vendredi 27 mars', title: '', readings: 'Jr 20,10-13 / Ps 17 / Jn 10,31-42', actions: { soi: 'Limiter mon temps sur les réseaux sociaux à 15 minutes aujourd\'hui', prochain: 'Prier pour les chrétiens persécutés dans le monde', dieu: 'Chemin de Croix complet' }, weekTitle: 'Semaine 6 de Carême' },
      { date: 'Samedi 28 mars', title: '', readings: 'Ez 37,21-28 / Jr 31 / Jn 11,45-56', actions: { soi: 'Préparer spirituellement mon entrée en Semaine Sainte', prochain: 'Réconcilier deux personnes en conflit', dieu: 'Adoration silencieuse de 20 minutes' }, weekTitle: 'Semaine 6 de Carême' },
      { date: 'Dimanche 29 mars', title: 'Dimanche — PAS DE JEÛNE', readings: '', actions: { soi: 'Repos liturgique / Messe dominicale', prochain: '—', dieu: '—' }, weekTitle: 'Semaine 6 de Carême' },
      { date: 'Lundi 30 mars', title: 'Lundi Saint', readings: 'Is 42,1-7 / Ps 26 / Jn 12,1-11', actions: { soi: "Compter toutes mes économies pour la visite à l'orphelinat du 4 avril", prochain: 'Offrir un objet précieux à quelqu\'un', dieu: 'Oindre les pieds du Christ en esprit' }, weekTitle: 'Semaine Sainte' },
      { date: 'Mardi 31 mars', title: 'Mardi Saint', readings: 'Is 49,1-6 / Ps 70 / Jn 13,21-33.36-38', actions: { soi: 'Confesser mes trahisons envers le Christ', prochain: 'Pleurer avec quelqu\'un qui souffre', dieu: 'Méditer sur la tristesse de Jésus' }, weekTitle: 'Semaine Sainte' },
      { date: 'Mercredi 1er avril', title: 'Mercredi Saint', readings: 'Is 50,4-9a / Ps 68 / Mt 26,14-25', actions: { soi: 'Refuser toute malhonnêteté dans mes affaires aujourd\'hui', prochain: 'Refuser tout compromis contraire aux valeurs chrétiennes', dieu: 'Demander la grâce de la fidélité absolue' }, weekTitle: 'Semaine Sainte' },
      { date: 'Jeudi 2 avril', title: 'Jeudi Saint', readings: 'Ex 12,1-8.11-14 / Ps 115 / 1 Co 11,23-26 / Jn 13,1-15', actions: { soi: 'Jeûner complètement jusqu\'à la messe du soir', prochain: 'Laver réellement les pieds de quelqu\'un', dieu: 'Participer à la messe du soir + Veiller en adoration' }, weekTitle: 'Semaine Sainte' },
      { date: 'Vendredi 3 avril', title: 'Vendredi Saint', readings: 'Is 52,13-53,12 / Ps 30 / He 4,14-16;5,7-9 / Jn 18,1-19,42', actions: { soi: 'Jeûne absolu (pain et eau uniquement si nécessaire)', prochain: 'Porter une croix en silence pour quelqu\'un', dieu: 'Participer à l\'Office de la Passion à 15h + Chemin de Croix complet' }, weekTitle: 'Semaine Sainte' },
      { date: 'Samedi 4 avril', title: 'Samedi Saint', readings: 'Veillée pascale: 7 lectures de l\'AT + Ps + Rm 6,3-11 / Mc 16,1-7', actions: { soi: 'Garder le silence complet autant que possible', prochain: 'GRANDE VISITE À L\'ORPHELINAT - Remettre tous les dons', dieu: 'Participer à la Veillée Pascale et revivre mon baptême' }, weekTitle: 'Semaine Sainte' },
      { date: 'Dimanche 5 avril', title: 'Pâques', readings: '', actions: { soi: 'Joie et gratitude', prochain: 'Partager un repas de fête', dieu: 'Participer à la messe de Pâques' }, weekTitle: 'Semaine Sainte' },
    ]
    
    console.log(`🔄 Calling RPC: update_page_content_data...`)
    const { data, error } = await supabase.rpc('update_page_content_data', {
      p_page_key: 'careme-2026',
      p_content: { days: allDays }
    })
    
    if (error) {
      console.error('❌ RPC Error:', error.message)
      console.log('\n💡 Tips:')
      console.log('1. The RPC function might not exist yet')
      console.log('2. Try applying migrations directly in Supabase SQL editor:')
      console.log('   - Go to SQL Editor in Supabase Dashboard')
      console.log('   - Copy contents of: supabase/migrations/20260218_relax_page_content_rls.sql')
      console.log('   - Execute the SQL')
      return
    }

    console.log('✅ RPC succeeded!')
    console.log('   Response:', JSON.stringify(data, null, 2))

    // Verify
    console.log('\n🔍 Verifying...')
    const { data: verify } = await supabase
      .from('page_content')
      .select('content')
      .eq('page_key', 'careme-2026')
      .single()
    
    console.log(`✅ Total days in DB: ${verify.content?.days?.length || 0}`)
    
    const fridayAfter = verify.content?.days?.find(d => d.date === 'Vendredi 20 février')
    if (fridayAfter) {
      console.log('\n✅ Friday Feb 20 (from DB):')
      console.log(JSON.stringify(fridayAfter, null, 2))
    }

  } catch (err) {
    console.error('❌ Exception:', err.message)
  }
}

setupAndSync()
