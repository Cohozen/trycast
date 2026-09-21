-- Phases finales (DS du 2026-09-21) : la bande des journées du détail de
-- ligue distingue les étapes à élimination directe (1/8, 1/4, 1/2, finale)
-- des journées de poule.
--
-- matches.round est le « week » brut de Highlightly : il ne dit rien des
-- phases finales. Une étape est donc, comme une phase du joker, une FENÊTRE DE
-- DATES par compétition — mais dans une table à part : la granularité des
-- étapes (quarts, demies, finale) n'a pas à dicter celle du joker (un par
-- phase), décision actée le 2026-09-21.
--
-- ⚠️ Une compétition doit recevoir ses étapes AVANT son premier match à
-- élimination directe : sans étape, ces matchs retombent dans le regroupement
-- par round brut (seed : scripts/seed-competitions.sql).
--
-- kind pilote l'affichage client (libellé court, titre, trophée) :
--   r16 / qf / sf / final — étapes classiques d'un tableau ;
--   finals — week-end de finales à plusieurs matchs de classement (Nations
--   Championship), qui n'est pas « la » finale.

create table public.competition_stages (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references public.competitions (id) on delete cascade,
  key text not null check (key ~ '^[a-z][a-z0-9_]{1,39}$'),
  kind text not null check (kind in ('r16', 'qf', 'sf', 'final', 'finals')),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  sort int not null default 0,
  check (starts_at < ends_at),
  unique (competition_id, key),
  constraint competition_stages_no_overlap exclude using gist (
    competition_id with =,
    tstzrange(starts_at, ends_at) with &&
  )
);

alter table public.competition_stages enable row level security;

-- Données de référence : lecture pour tout connecté, aucune écriture client
create policy "competition_stages_select_authenticated"
  on public.competition_stages for select
  to authenticated
  using (true);

revoke all on public.competition_stages from anon, authenticated;
grant select on public.competition_stages to authenticated;
grant all on public.competition_stages to service_role;

-- get_league_round_points (20260716000400) : les matchs dont le kickoff tombe
-- dans une étape sont regroupés PAR ÉTAPE (round renvoyé à null, stage_key et
-- stage_kind renseignés) ; les autres gardent le regroupement par round.
-- Le type de retour change → drop puis create. Le reste (garde d'appartenance,
-- critère « score exact », 0 pt sans prono) est inchangé.
drop function public.get_league_round_points (uuid);

create function public.get_league_round_points(p_league_id uuid)
returns table (
    round text,
    stage_key text,
    stage_kind text,
    first_kickoff timestamptz,
    user_id uuid,
    username text,
    avatar_url text,
    points int,
    exact_scores int
)
language sql
stable
security definer
set search_path = ''
as $$
    with league as (
        select l.id, l.competition_id
        from public.leagues l
        where l.id = p_league_id and public.is_league_member(p_league_id)
    ),
    bucketed as (
        -- Groupe de chaque match : son étape si son kickoff tombe dans une
        -- fenêtre [starts_at, ends_at), sinon son round brut
        select
            m.id, m.status, m.kickoff_at, m.home_score, m.away_score,
            case when cs.key is null then m.round end as round,
            cs.key as stage_key,
            cs.kind as stage_kind
        from public.matches m
        join league lg on lg.competition_id = m.competition_id
        left join public.competition_stages cs
            on cs.competition_id = m.competition_id
            and m.kickoff_at >= cs.starts_at
            and m.kickoff_at < cs.ends_at
    ),
    rounds as (
        -- Journées / étapes entamées : au moins un match terminé
        select b.round, b.stage_key, b.stage_kind, min(b.kickoff_at) as first_kickoff
        from bucketed b
        where b.status = 'finished'
        group by b.round, b.stage_key, b.stage_kind
    ),
    scored as (
        -- Pronos réconciliés des seuls membres de la ligue
        select b.round, b.stage_key, p.user_id, p.points_awarded,
            (p.predicted_home_score = b.home_score
                and p.predicted_away_score = b.away_score) as is_exact
        from public.predictions p
        join bucketed b on b.id = p.match_id
        join public.league_members lm
            on lm.league_id = p_league_id and lm.user_id = p.user_id
        where p.scored_at is not null
    )
    select
        r.round,
        r.stage_key,
        r.stage_kind,
        r.first_kickoff,
        lm.user_id,
        pr.username,
        pr.avatar_url,
        coalesce(sum(s.points_awarded), 0)::int as points,
        (count(*) filter (where s.is_exact))::int as exact_scores
    from public.league_members lm
    join league lg on lg.id = lm.league_id
    join public.profiles pr on pr.id = lm.user_id
    cross join rounds r
    left join scored s
        on s.user_id = lm.user_id
        -- round et stage_key sont nullables : is not distinct from apparie les null
        and s.round is not distinct from r.round
        and s.stage_key is not distinct from r.stage_key
    where lm.league_id = p_league_id
    group by r.round, r.stage_key, r.stage_kind, r.first_kickoff,
        lm.user_id, pr.username, pr.avatar_url
    order by r.first_kickoff, points desc, exact_scores desc, lower(pr.username);
$$;

-- Les fonctions naissent exécutables par public
revoke execute on function public.get_league_round_points (uuid) from public, anon;
grant execute on function public.get_league_round_points (uuid) to authenticated;
