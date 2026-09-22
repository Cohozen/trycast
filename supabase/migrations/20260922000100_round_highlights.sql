-- Coup de la journée (v1.1.0) : dans une ligue et pour une journée, le prono
-- qui a trouvé la bonne issue CONTRE la majorité stricte de la ligue et qui a
-- rapporté le plus de points (joker compris, points_awarded l'inclut déjà).
--
-- Règles (décisions de Corentin, 2026-09-21) :
-- - journée = même regroupement que get_league_round_points (étape KO si le
--   kickoff tombe dans une fenêtre de competition_stages, sinon round brut) ;
-- - journée COMPLÈTE : tous ses matchs non reportés/annulés sont finished et
--   scorés, ET aucun prono de membre n'attend son bonus offensif (le coup est
--   alors définitif : la passe 2 ne peut plus changer le lauréat) ;
-- - match à contre-courant : au moins 3 pronos de membres, et strictement
--   moins de la moitié ont l'issue réelle (1 contre 1 n'est pas un courant) ;
-- - lauréats : les pronos gagnants (> 0 pt) de ces matchs au maximum de points
--   de la journée ; plus de 3 ex æquo → pas de coup. Pas de carte de repli :
--   le coup doit rester rare.
-- Rien n'est stocké : tout se dérive des pronos, visibles dans la ligue après
-- le coup d'envoi (aucune donnée nouvelle au sens RGPD).

-- ─── Calcul ──────────────────────────────────────────────────────────────────
-- Fonction interne, sans grant client : la garde d'appartenance est portée par
-- get_league_round_highlights, et notify_round_highlight_targets (service_role)
-- l'appelle pour toutes les ligues.
create function public.league_round_highlights(p_league_id uuid)
returns table (
    round text,
    stage_key text,
    stage_kind text,
    round_key text,
    match_id uuid,
    user_id uuid,
    username text,
    avatar_url text,
    predicted_home_score int,
    predicted_away_score int,
    points int,
    is_exact boolean,
    is_joker boolean,
    is_draw boolean,
    is_outsider boolean,
    crowd_outcome text,
    crowd_count int,
    winners_count int,
    predictions_count int,
    anchor_match_id uuid,
    last_kickoff timestamptz,
    last_scored_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
    with bucketed as (
        -- ponytail: jointure recopiée de get_league_round_points
        -- (20260921000100) ; l'extraire en vue si un 3e consommateur apparaît
        select
            m.id, m.status, m.kickoff_at, m.scored_at, m.home_score, m.away_score,
            m.odds_home, m.odds_away, m.odds_source,
            case when cs.key is null then m.round end as round,
            cs.key as stage_key,
            cs.kind as stage_kind
        from public.leagues l
        join public.matches m on m.competition_id = l.competition_id
        left join public.competition_stages cs
            on cs.competition_id = m.competition_id
            and m.kickoff_at >= cs.starts_at
            and m.kickoff_at < cs.ends_at
        where l.id = p_league_id
    ),
    preds as (
        -- Pronos réconciliés des membres ACTUELS de la ligue
        select
            b.*,
            p.user_id,
            p.predicted_home_score,
            p.predicted_away_score,
            p.points_awarded,
            p.points_breakdown,
            sign(p.predicted_home_score - p.predicted_away_score) as picked,
            sign(b.home_score - b.away_score) as actual
        from bucketed b
        join public.predictions p on p.match_id = b.id
        join public.league_members lm
            on lm.league_id = p_league_id and lm.user_id = p.user_id
        where p.scored_at is not null
    ),
    complete as (
        select
            b.round,
            b.stage_key,
            max(b.kickoff_at) as last_kickoff,
            max(b.scored_at) as last_scored_at,
            -- Ancre de la notification : le dernier match de la journée
            (array_agg(b.id order by b.kickoff_at desc, b.id))[1] as anchor_match_id
        from bucketed b
        where b.status not in ('postponed', 'cancelled')
        group by b.round, b.stage_key
        having bool_and(b.status = 'finished' and b.scored_at is not null)
    ),
    settled as (
        -- Aucun bonus offensif en attente dans la ligue sur cette journée
        select c.*
        from complete c
        where not exists (
            select 1 from preds pr
            where pr.round is not distinct from c.round
                and pr.stage_key is not distinct from c.stage_key
                and coalesce((pr.points_breakdown ->> 'offensiveBonusPending')::boolean, false)
        )
    ),
    match_stats as (
        select pr.id as match_id,
            count(*)::int as n,
            (count(*) filter (where pr.picked = pr.actual))::int as k
        from preds pr
        group by pr.id
    ),
    crowd as (
        -- Issue la plus pronostiquée par la ligue (égalité : départage stable)
        select distinct on (pr.id) pr.id as match_id, pr.picked, count(*)::int as crowd_count
        from preds pr
        group by pr.id, pr.picked
        order by pr.id, count(*) desc, pr.picked desc
    ),
    candidates as (
        select pr.*, ms.n, ms.k, s.last_kickoff, s.last_scored_at, s.anchor_match_id,
            rank() over (
                partition by pr.round, pr.stage_key order by pr.points_awarded desc
            ) as rnk
        from preds pr
        join settled s
            on s.round is not distinct from pr.round
            and s.stage_key is not distinct from pr.stage_key
        join match_stats ms on ms.match_id = pr.id
        where pr.picked = pr.actual
            and ms.n >= 3
            and 2 * ms.k < ms.n
            and pr.points_awarded > 0
    ),
    laureates as (
        select c.*, count(*) over (partition by c.round, c.stage_key) as ties
        from candidates c
        where c.rnk = 1
    )
    select
        l.round,
        l.stage_key,
        l.stage_kind,
        -- Miroir de roundGroupKey (apps/mobile/src/features/leagues/round-points.ts)
        coalesce('stage:' || l.stage_key, l.round, 'sans-round') as round_key,
        l.id as match_id,
        l.user_id,
        pf.username,
        pf.avatar_url,
        l.predicted_home_score,
        l.predicted_away_score,
        l.points_awarded as points,
        (l.predicted_home_score = l.home_score
            and l.predicted_away_score = l.away_score) as is_exact,
        coalesce((l.points_breakdown ->> 'jokerMultiplier')::int, 1) = 2 as is_joker,
        l.actual = 0 as is_draw,
        -- Outsider : cote de l'équipe choisie au-dessus de l'adverse, sur des
        -- cotes réelles seulement (les cotes par défaut sont égales)
        coalesce(
            l.odds_source = 'api'
            and case l.picked
                when 1 then l.odds_home > l.odds_away
                when -1 then l.odds_away > l.odds_home
                else false
            end,
            false
        ) as is_outsider,
        case cr.picked when 1 then 'home' when -1 then 'away' else 'draw' end as crowd_outcome,
        cr.crowd_count,
        l.k as winners_count,
        l.n as predictions_count,
        l.anchor_match_id,
        l.last_kickoff,
        l.last_scored_at
    from laureates l
    join crowd cr on cr.match_id = l.id
    join public.profiles pf on pf.id = l.user_id
    where l.ties <= 3
    order by l.last_kickoff, lower(pf.username);
$$;

revoke execute on function public.league_round_highlights (uuid) from public, anon, authenticated;
grant execute on function public.league_round_highlights (uuid) to service_role;

-- ─── Lecture client ──────────────────────────────────────────────────────────
-- Même garde que get_league_round_points : un non-membre reçoit 0 ligne.
create function public.get_league_round_highlights(p_league_id uuid)
returns table (
    round text,
    stage_key text,
    stage_kind text,
    round_key text,
    match_id uuid,
    user_id uuid,
    username text,
    avatar_url text,
    predicted_home_score int,
    predicted_away_score int,
    points int,
    is_exact boolean,
    is_joker boolean,
    is_draw boolean,
    is_outsider boolean,
    crowd_outcome text,
    crowd_count int,
    winners_count int,
    predictions_count int
)
language sql
stable
security definer
set search_path = ''
as $$
    select h.round, h.stage_key, h.stage_kind, h.round_key, h.match_id, h.user_id,
        h.username, h.avatar_url, h.predicted_home_score, h.predicted_away_score,
        h.points, h.is_exact, h.is_joker, h.is_draw, h.is_outsider,
        h.crowd_outcome, h.crowd_count, h.winners_count, h.predictions_count
    from public.league_round_highlights(p_league_id) h
    where public.is_league_member(p_league_id);
$$;

revoke execute on function public.get_league_round_highlights (uuid) from public, anon;
grant execute on function public.get_league_round_highlights (uuid) to authenticated;

-- ─── Journal des envois ──────────────────────────────────────────────────────
-- Une notification de coup de la journée vise (membre × ligue × journée) :
-- match_id porte l'ANCRE (dernier match de la journée), league_id distingue deux
-- ligues de la même compétition. La clé d'unicité passe à 4 colonnes en
-- « nulls not distinct » (PG 15+) : pour rappels et résultats, league_id est
-- null et la déduplication reste (user, match, type) comme avant.
-- ⚠️ L'EF notify doit passer onConflict 'user_id,match_id,type,league_id' : la
-- déployer juste après ce push (un tick entre les deux échoue au claim, sans
-- rien envoyer, et se rattrape au suivant).
alter table public.notification_sends
    add column league_id uuid references public.leagues (id) on delete cascade;

alter table public.notification_sends drop constraint notification_sends_type_check;
alter table public.notification_sends
    add constraint notification_sends_type_check
    check (type in ('reminder', 'result', 'round_highlight'));

alter table public.notification_sends
    add constraint notification_sends_league_check
    check ((type = 'round_highlight') = (league_id is not null));

alter table public.notification_sends drop constraint notification_sends_user_id_match_id_type_key;
alter table public.notification_sends
    add constraint notification_sends_user_match_type_league_key
    unique nulls not distinct (user_id, match_id, type, league_id);

-- ─── Préférence ──────────────────────────────────────────────────────────────
alter table public.notification_prefs
    add column round_highlight_enabled boolean not null default true;

grant insert (round_highlight_enabled) on public.notification_prefs to authenticated;
grant update (round_highlight_enabled) on public.notification_prefs to authenticated;

-- ─── Cibles de la notification ───────────────────────────────────────────────
-- Tous les membres (lauréats compris, prévenus à part) des ligues dont une
-- journée vient de se compléter avec un coup. Deux bornes contre l'envoi
-- rétroactif : dernier scoring de moins de 24 h (la passe 2 qui solde un bonus
-- le rafraîchit : c'est voulu, la journée n'est complète qu'à ce moment) ET
-- dernier match de la journée joué il y a moins de 7 jours (un re-scoring de
-- barème rafraîchit scored_at de tout l'historique).
create function public.notify_round_highlight_targets()
returns table (
    league_id uuid,
    league_name text,
    anchor_match_id uuid,
    round_key text,
    user_id uuid,
    is_laureate boolean,
    token text,
    locale text
)
language sql
stable
set search_path = ''
as $$
    with coups as (
        select l.id as league_id, l.name as league_name, h.*
        from public.leagues l
        join public.competitions c on c.id = l.competition_id and c.is_active
        cross join lateral public.league_round_highlights(l.id) h
        -- ponytail: calcul complet par ligue à chaque tick ; indexer ou
        -- matérialiser si le nombre de ligues actives le rend lent
        where exists (
                select 1 from public.matches m
                where m.competition_id = l.competition_id
                    and m.scored_at >= now() - interval '24 hours'
            )
            and h.last_scored_at >= now() - interval '24 hours'
            and h.last_kickoff >= now() - interval '7 days'
    ),
    journees as (
        select distinct c.league_id, c.league_name, c.anchor_match_id, c.round_key
        from coups c
    )
    select
        j.league_id,
        j.league_name,
        j.anchor_match_id,
        j.round_key,
        lm.user_id,
        exists (
            select 1 from coups c
            where c.league_id = j.league_id
                and c.round_key = j.round_key
                and c.user_id = lm.user_id
        ) as is_laureate,
        pt.token,
        coalesce(pr.locale, 'fr') as locale
    from journees j
    join public.league_members lm on lm.league_id = j.league_id
    join public.push_tokens pt on pt.user_id = lm.user_id
    join public.profiles pr on pr.id = lm.user_id
    left join public.notification_prefs np on np.user_id = lm.user_id
    where coalesce(np.master and np.round_highlight_enabled, true)
        and not exists (
            select 1 from public.notification_sends ns
            where ns.user_id = lm.user_id
                and ns.match_id = j.anchor_match_id
                and ns.type = 'round_highlight'
                and ns.league_id = j.league_id
        );
$$;

revoke execute on function public.notify_round_highlight_targets () from public, anon, authenticated;
grant execute on function public.notify_round_highlight_targets () to service_role;
