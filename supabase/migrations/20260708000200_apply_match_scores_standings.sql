-- Lot 5 : apply_match_scores ré-agrège standings après l'écriture des points.
-- create or replace COMPLET de la fonction du Lot 4 (20260707000200) — guards,
-- verrou match et écritures predictions inchangés. Deux ajouts :
--   1. verrou sur la ligne competitions (sérialise deux scorings concurrents
--      de la même compétition : l'agrégat est un recalcul absolu, il ne doit
--      jamais lire un état intermédiaire) ;
--   2. upsert standings des users du match (recalcul absolu depuis les pronos
--      scorés de la compétition — jamais d'incrément, l'idempotence de la RPC
--      est conservée). Agrégation identique au backfill (20260708000100) :
--      toute évolution du critère (notamment exact_scores) doit toucher les
--      deux fichiers.

create or replace function public.apply_match_scores(
    p_match_id uuid,
    p_rule_version int,
    p_predictions jsonb
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_match public.matches%rowtype;
    v_expected int;
    v_updated int;
begin
    -- Verrou : sérialise deux runs concurrents du cron sur le même match
    select * into v_match from public.matches where id = p_match_id for update;
    if not found then
        raise exception 'apply_match_scores: match % introuvable', p_match_id;
    end if;
    -- Verrou compétition : sérialise deux scorings concurrents de matchs
    -- différents de la même compétition (cf. en-tête, ré-agrégation standings)
    perform 1 from public.competitions where id = v_match.competition_id for update;
    if v_match.status <> 'finished' then
        raise exception 'apply_match_scores: match % non terminé (statut %)',
            p_match_id, v_match.status;
    end if;
    if v_match.home_score is null or v_match.away_score is null then
        raise exception 'apply_match_scores: match % sans score final', p_match_id;
    end if;
    if v_match.needs_review then
        raise exception 'apply_match_scores: match % en attente de revue admin', p_match_id;
    end if;
    if not exists (select 1 from public.scoring_rules where version = p_rule_version) then
        raise exception 'apply_match_scores: barème version % inconnu', p_rule_version;
    end if;
    if p_predictions is null or jsonb_typeof(p_predictions) <> 'array' then
        raise exception 'apply_match_scores: p_predictions doit être un tableau jsonb';
    end if;

    select count(*) into v_expected from public.predictions where match_id = p_match_id;
    if v_expected <> jsonb_array_length(p_predictions) then
        raise exception 'apply_match_scores: % pronos attendus pour le match %, % fournis',
            v_expected, p_match_id, jsonb_array_length(p_predictions);
    end if;

    update public.predictions p
    set points_awarded = (e ->> 'points_awarded')::int,
        points_breakdown = e -> 'points_breakdown',
        scoring_rule_version = p_rule_version,
        scored_at = now()
    from jsonb_array_elements(p_predictions) e
    where p.id = (e ->> 'prediction_id')::uuid
      and p.match_id = p_match_id; -- un id hors match ne matche pas → écart détecté dessous
    get diagnostics v_updated = row_count;
    if v_updated <> jsonb_array_length(p_predictions) then
        raise exception 'apply_match_scores: payload incohérent (% pronos mis à jour, % fournis)',
            v_updated, jsonb_array_length(p_predictions);
    end if;

    -- Ré-agrégation standings des users du match : recalcul ABSOLU depuis les
    -- pronos scorés de la compétition (payload [] → 0 user → no-op). Les
    -- predictions du match viennent d'être mises à jour dans cette transaction.
    insert into public.standings
        (user_id, competition_id, total_points, predictions_scored, exact_scores, updated_at)
    select
        p.user_id,
        v_match.competition_id,
        coalesce(sum(p.points_awarded), 0)::int,
        count(*)::int,
        (count(*) filter (
            where p.predicted_home_score = m.home_score
                and p.predicted_away_score = m.away_score
        ))::int,
        now()
    from public.predictions p
    join public.matches m on m.id = p.match_id
    where m.competition_id = v_match.competition_id
      and p.scored_at is not null
      and p.user_id in (select user_id from public.predictions where match_id = p_match_id)
    group by p.user_id
    on conflict (user_id, competition_id) do update
    set total_points = excluded.total_points,
        predictions_scored = excluded.predictions_scored,
        exact_scores = excluded.exact_scores,
        updated_at = now();

    -- Horodatage du dernier scoring (match sans prono : payload [] accepté,
    -- le match sort quand même du pipeline de la passe 1)
    update public.matches set scored_at = now() where id = p_match_id;

    return jsonb_build_object('match_id', p_match_id, 'predictions_scored', v_updated);
end;
$$;

-- Les fonctions naissent exécutables par public : service_role uniquement
revoke execute on function public.apply_match_scores (uuid, int, jsonb)
from public, anon, authenticated;

grant execute on function public.apply_match_scores (uuid, int, jsonb) to service_role;
