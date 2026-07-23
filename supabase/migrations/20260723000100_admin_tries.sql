-- Outillage de saisie admin des essais (2026-07-23).
--
-- Les essais ne sont pas fournis par l'API : ils se saisissent à la main après
-- chaque match. Jusqu'ici il fallait retrouver l'api_game_id en croisant
-- matches et teams, puis remplir un gabarit d'UPDATE (scripts/admin-set-tries.sql).
-- La difficulté était donc la LECTURE, pas l'écriture — d'où une vue lisible
-- plutôt qu'une interface d'administration.
--
-- Rappel du pipeline, que cette migration ne rejoue pas :
--   * sync-results lève tries_missing à l'écriture d'un score final sans essais ;
--   * la passe 2 (bonus offensif) est automatique — le cron sync-results-10min
--     ramasse les pronos portant points_breakdown->>'offensiveBonusPending',
--     donc les points arrivent en ≤ 10 min APRÈS la saisie, sans rien faire ;
--   * un match needs_review est exclu de tout le pipeline : y saisir les essais
--     ne déclenchera jamais la passe 2 tant que le drapeau n'est pas retiré.
--     La vue le signale, sinon la saisie serait sans effet visible.
--
-- La fonction est volontairement INVOKER, pas security definer : seuls
-- service_role et postgres peuvent l'exécuter, et ils ont déjà grant all sur
-- matches (20260705000400). Aucune élévation de privilège à créer tant qu'il
-- n'existe pas d'app admin — le jour venu, ce sera un choix explicite.

-- security_invoker : sans lui, la vue serait « security definer » au sens de
-- l'advisor Supabase (lint security_definer_view). Sans effet pratique ici
-- (postgres et service_role contournent RLS), mais on ne laisse pas traîner
-- une vue privilégiée dans public.
create view public.admin_matches_pending_tries
with (security_invoker = on)
as
select
  m.api_game_id,
  case
    when m.needs_review then 'bloqué (needs_review)'
    when m.tries_missing then 'essais à saisir'
    else 'scoring en attente'
  end as etat,
  h.name as home,
  a.name as away,
  m.home_score,
  m.away_score,
  m.home_tries,
  m.away_tries,
  pending.n as pending_predictions,
  m.needs_review,
  c.name as competition,
  m.round,
  m.kickoff_at
from public.matches m
join public.competitions c on c.id = m.competition_id
-- Équipes nullables (matchs « à déterminer » avant tirage) : left join
left join public.teams h on h.id = m.home_team_id
left join public.teams a on a.id = m.away_team_id
cross join lateral (
  select count(*) as n
  from public.predictions p
  where p.match_id = m.id
    and p.points_breakdown ->> 'offensiveBonusPending' = 'true'
) as pending
where m.status = 'finished'
  and (m.tries_missing or pending.n > 0)
order by m.kickoff_at desc;

comment on view public.admin_matches_pending_tries is
  'Matchs terminés en attente d''une action admin : essais à saisir, ou passe 2 du scoring pas encore appliquée. Vide = rien à faire.';

create or replace function public.admin_set_match_tries(
    p_api_game_id int,
    p_home_tries int,
    p_away_tries int
)
returns public.matches
language plpgsql
set search_path = ''
as $$
declare
    v_match public.matches;
begin
    if p_home_tries is null or p_away_tries is null
        or p_home_tries < 0 or p_away_tries < 0 then
        raise exception 'admin_set_match_tries: essais invalides (% / %)',
            p_home_tries, p_away_tries using errcode = '23514';
    end if;

    select * into v_match
    from public.matches
    where api_game_id = p_api_game_id
    for update;

    if not found then
        raise exception 'admin_set_match_tries: aucun match api_game_id = %',
            p_api_game_id using errcode = 'P0002';
    end if;

    if v_match.status <> 'finished' then
        raise exception 'admin_set_match_tries: match % non terminé (statut %)',
            p_api_game_id, v_match.status using errcode = '23514';
    end if;

    -- Un essai vaut au minimum 5 points : 5 × essais > score du camp est
    -- forcément une faute de saisie, typiquement les deux nombres inversés.
    -- Si c'est le score qui est faux, le corriger avant de rappeler la fonction.
    if 5 * p_home_tries > coalesce(v_match.home_score, 0)
        or 5 * p_away_tries > coalesce(v_match.away_score, 0) then
        raise exception
            'admin_set_match_tries: essais % / % incompatibles avec le score % - % (nombres inversés ?)',
            p_home_tries, p_away_tries, v_match.home_score, v_match.away_score
            using errcode = '23514';
    end if;

    update public.matches
    set home_tries = p_home_tries,
        away_tries = p_away_tries,
        tries_missing = false
    where id = v_match.id
    returning * into v_match;

    return v_match;
end;
$$;

comment on function public.admin_set_match_tries (int, int, int) is
  'Saisie admin des essais d''un match terminé. Les points suivent au prochain tick de sync-results (≤ 10 min).';

-- Le projet dev applique encore les default privileges legacy (grant all à
-- anon/authenticated sur toute nouvelle relation), et une fonction naît
-- exécutable par public : durcissement explicite, comme en 20260705000400.
revoke all on public.admin_matches_pending_tries from anon, authenticated;
grant select on public.admin_matches_pending_tries to service_role;
revoke execute on function public.admin_set_match_tries (int, int, int)
  from public, anon, authenticated;
grant execute on function public.admin_set_match_tries (int, int, int) to service_role;
