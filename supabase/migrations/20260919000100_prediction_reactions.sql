-- Réactions emoji sur les pronos (v1.1.0, 2026-09-19) : dans une ligue, après
-- le coup d'envoi, un membre réagit au prono d'un autre par l'une de quatre
-- réactions fermées. Liste fermée, JAMAIS de texte libre : aucun contenu
-- d'utilisateur à modérer (un texte libre ferait exiger par l'App Store
-- signalement et blocage, guideline 1.2).
--
-- Décisions Corentin (2026-09-19) :
--  - quatre clés stables, dans l'ordre d'affichage : bravo 👏, lucky 🍀,
--    bold 😲, laugh 😂. Le serveur stocke la CLÉ, jamais l'emoji : des pictos
--    maison remplaceront les emoji système sans migration ;
--  - une réaction par personne et par prono, modifiable — portée par la PK ;
--  - rattachée à la LIGUE, pas au prono seul : deux membres qui partagent deux
--    ligues ne voient pas dans l'une ce qui a été dit dans l'autre, dont
--    certains membres ne connaissent pas l'auteur ;
--  - les réactions SURVIVENT au départ de leur auteur de la ligue (d'où aucune
--    FK vers league_members) ; la lecture l'anonymise en « ancien membre ».
--    La suppression du compte, elle, les efface (cascade sur profiles).
--
-- Aucun grant client sur la table : écritures par set_/clear_prediction_reaction,
-- lectures par get_match_league_predictions (compteurs) et
-- get_prediction_reactors (liste nominative) — migrations suivantes.

create table public.prediction_reactions (
  league_id uuid not null references public.leagues (id) on delete cascade,
  match_id uuid not null references public.matches (id) on delete cascade,
  target_user_id uuid not null references public.profiles (id) on delete cascade,
  reactor_id uuid not null references public.profiles (id) on delete cascade,
  reaction text not null check (reaction in ('bravo', 'lucky', 'bold', 'laugh')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (league_id, match_id, target_user_id, reactor_id),
  check (target_user_id <> reactor_id)
);

-- La PK couvre déjà la lecture par (ligue, match) ; celui-ci sert la cascade
-- et l'export RGPD (« mes réactions »).
create index prediction_reactions_reactor_idx on public.prediction_reactions (reactor_id);

alter table public.prediction_reactions enable row level security;

revoke all on public.prediction_reactions from anon, authenticated;
grant all on public.prediction_reactions to service_role;
