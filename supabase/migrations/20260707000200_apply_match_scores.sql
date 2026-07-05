-- Lot 4 : écriture atomique du scoring d'un match (décision actée : calcul en
-- TS pur dans l'Edge Function, la RPC ne fait que l'écriture transactionnelle).
-- Idempotente par construction : écritures absolues (jamais d'incrément),
-- rejouer le même payload reproduit le même état — la passe 2 (après saisie
-- admin des essais) rappelle la même fonction avec un payload recalculé.
--
-- p_predictions : tableau jsonb d'entrées
--   { "prediction_id": uuid, "points_awarded": int, "points_breakdown": jsonb }
-- (points_breakdown = type TS PointsBreakdown, camelCase, stocké tel quel).
-- Le payload doit couvrir EXACTEMENT les pronos du match : pas de scoring
-- partiel silencieux, pas d'id étranger.

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
