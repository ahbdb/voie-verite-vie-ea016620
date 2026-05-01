-- Initialize page_content with careme-2026 and chemin-de-croix
-- This migration ensures that default data exists for these pages

INSERT INTO public.page_content (page_key, title, subtitle, content)
VALUES 
(
  'careme-2026',
  'Carême 2026',
  '40 jours de prière, pénitence et partage',
  '{"days": [{"date": "Mercredi 18 février", "title": "Mercredi des Cendres", "readings": "Jl 2,12-18 / Ps 50 / 2 Co 5,20-6,2 / Mt 6,1-6.16-18", "actions": {"soi": "Faire un examen de conscience approfondi", "prochain": "Demander pardon à une personne que j''ai blessée", "dieu": "Prier le Notre-Père avec intention"}, "weekTitle": "Semaine 1 de Carême"}]}'
),
(
  'chemin-de-croix',
  'Chemin de Croix',
  '14 stations de méditation',
  '{"community": "Communauté Voie, Vérité, Vie", "verse": "Je suis le Chemin, la Vérité et la Vie - Jean 14,6", "duration": "20 minutes", "stations": [{"number": 1, "title": "Jésus est condamné à mort", "reading": "Mt 27,24-26", "text": "Pilate se lava les mains", "meditation": "Jésus se laisse condamner", "prayer": "Seigneur, aide-moi"}], "conclusion": "Que la Croix du Christ nous guide"}'
)
ON CONFLICT DO NOTHING;
