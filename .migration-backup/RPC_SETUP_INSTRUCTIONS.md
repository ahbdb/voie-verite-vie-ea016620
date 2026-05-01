# 🔧 Instructions pour Activer la RPC et Charger les 47 Jours

## Étape 1: Créer la RPC dans Supabase

1. Va sur le dashboard Supabase: https://app.supabase.com/
2. Sélectionne ton projet
3. Aller à **SQL Editor** (en bas à gauche)
4. Clique sur **New Query**
5. **Copie-colle ce code SQL:**

```sql
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
```

6. Clique **Run** ✓

## Étape 2: Charger les 47 Jours

Une fois la RPC créée, exécute:

```bash
node sync-via-rpc.mjs
```

## Vérification

Va sur https://kaddsojhnkyfavaulrfc.supabase.co/project/default/editor (ouvre Table Editor):
- Clique sur **page_content**
- Cherche **careme-2026**
- Vérifie que `content.days` contient 47 éléments

## Test du Vendredi 20 février

Après le chargement, le vendredi devrait afficher:
- `prochain: "merci"` ✅

À partir de ce moment, l'admin peut modifier et sauvegarder via la RPC! 🎉
