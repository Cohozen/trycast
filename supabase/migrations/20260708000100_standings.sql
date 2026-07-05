-- Lot 5 : classements dénormalisés par (user, compétition), maintenus par la
-- RPC apply_match_scores (recalcul absolu à chaque scoring — migration
-- suivante). Une seule ligne par user et par compétition sert les DEUX
-- classements : général (tous les rows de la compétition) et par ligue
-- (league_members ⋈ standings) — les points rétroactifs en rejoignant une
-- ligue en cours sont gratuits par construction.

create table public.standings (
    user_id uuid not null references public.profiles (id) on delete cascade,
    competition_id uuid not null references public.competitions (id) on delete cascade,
    total_points int not null default 0,
    predictions_scored int not null default 0,
    -- tie-breaker du classement (total > exacts > moins de pronos)
    exact_scores int not null default 0,
    updated_at timestamptz not null default now(),
    primary key (user_id, competition_id)
);

-- Classement général : filtre compétition + tri points
create index standings_competition_points_idx
on public.standings (competition_id, total_points desc);

alter table public.standings enable row level security;

-- Lecture par tout utilisateur connecté (le classement général est public dans
-- l'app) ; aucune policy d'écriture : seule apply_match_scores (security
-- definer) écrit.
create policy "standings_select_authenticated" on public.standings
    for select to authenticated
    using (true);

-- Default privileges legacy du projet dev : revoke + regrant explicites
revoke all on public.standings from anon, authenticated;
grant select on public.standings to authenticated;
grant all on public.standings to service_role;

-- Backfill : des matchs sont déjà scorés (journée 1 du NC 2026). Agrégation
-- identique à celle d'apply_match_scores (20260708000200) — toute évolution du
-- critère (notamment exact_scores) doit toucher les deux fichiers.
insert into public.standings (user_id, competition_id, total_points, predictions_scored, exact_scores)
select
    p.user_id,
    m.competition_id,
    coalesce(sum(p.points_awarded), 0)::int,
    count(*)::int,
    (count(*) filter (
        where p.predicted_home_score = m.home_score
            and p.predicted_away_score = m.away_score
    ))::int
from public.predictions p
join public.matches m on m.id = p.match_id
where p.scored_at is not null
group by p.user_id, m.competition_id;
