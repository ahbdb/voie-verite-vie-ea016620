-- Initialize Careme 2026 and Chemin de Croix default data
-- This ensures these pages have initial data in the database

-- Insert Careme 2026 if it doesn't exist
INSERT INTO public.page_content (page_key, title, subtitle, content)
VALUES (
  'careme-2026',
  'Carême 2026',
  '40 jours de prière, pénitence et partage',
  '{
    "days": [
      {
        "date": "Mercredi 18 février",
        "title": "Mercredi des Cendres",
        "readings": "Jl 2,12-18 / Ps 50 / 2 Co 5,20-6,2 / Mt 6,1-6.16-18",
        "actions": {
          "soi": "Faire un examen de conscience approfondi",
          "prochain": "Demander pardon à une personne que j''ai blessée",
          "dieu": "Prier le Notre-Père avec intention"
        },
        "weekTitle": "Semaine 1 de Carême"
      }
    ]
  }'
)
ON CONFLICT (page_key) DO NOTHING;

-- Insert Chemin de Croix if it doesn't exist
INSERT INTO public.page_content (page_key, title, subtitle, content)
VALUES (
  'chemin-de-croix',
  'Chemin de Croix',
  '14 stations de méditation',
  '{
    "community": "Communauté Voie, Vérité, Vie",
    "verse": "\"Je suis le Chemin, la Vérité et la Vie\" - Jean 14,6",
    "duration": "20 minutes",
    "stations": [
      {
        "number": 1,
        "title": "Jésus est condamné à mort",
        "reading": "Mt 27,24-26",
        "text": "Pilate, voyant qu''il ne gagnait rien, mais qu''au contraire du tumulte s''élevait, prit l''eau, se lava les mains devant la foule, en disant: Je suis innocent du sang de ce juste; cela vous regarde.",
        "meditation": "Jésus se laisse condamner innocemment pour nous. Medtons que nous, nous souvent condamnons autour de nous sans jugement juste.",
        "prayer": "Seigneur Jésus, aide-moi à reconnaître mes injustices et à les réparer."
      }
    ],
    "conclusion": "Que la Croix du Christ reste toujours pour nous un signe de salut et d''espérance."
  }'
)
ON CONFLICT (page_key) DO NOTHING;
