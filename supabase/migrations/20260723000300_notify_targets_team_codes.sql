-- Notifications push : les tricodes d'équipes dans les cibles.
--
-- `teams.name` est le nom API, donc en anglais (« New Zealand ») : un push
-- français annonçait « New Zealand 27 – 24 South Africa ». L'app traduit déjà
-- ces noms par tricode (teamName() + clés matches:teams.<code>) ; les RPC de
-- ciblage doivent donc exposer `teams.code` pour que l'EF notify fasse pareil.
-- Le nom brut reste transporté : c'est le repli des équipes hors nations
-- connues (code null ou absent de la table de traduction).
--
-- Le type de retour d'une fonction table ne se modifie pas par create or
-- replace : drop puis recréation — les grants tombent avec, ils sont rejoués.

drop function if exists public.notify_reminder_targets ();
drop function if exists public.notify_result_targets ();

-- Cibles des rappels de prono : matchs à H-1 du kickoff, users équipés d'un
-- token, préférence activée (absence de ligne prefs = activé), sans prono sur
-- le match, jamais rappelés pour ce match. Une ligne par (user, match, token) —
-- l'EF regroupe par (user, match) pour le claim.
-- kickoff_at > now() : jamais de rappel après le coup d'envoi, même si le cron
-- a raté des ticks. status = 'scheduled' strict : pas de rappel pour un match
-- reporté/annulé. Jointures internes sur teams : un match « à déterminer »
-- (équipes null, RWC 2027) ne se pronostique pas, donc ne se rappelle pas.
create or replace function public.notify_reminder_targets()
returns table (
  match_id uuid,
  user_id uuid,
  token text,
  locale text,
  home_team text,
  away_team text,
  home_code text,
  away_code text,
  kickoff_at timestamptz
)
language sql
stable
set search_path = ''
as $$
  select
    m.id as match_id,
    pt.user_id,
    pt.token,
    coalesce(pr.locale, 'fr') as locale,
    th.name as home_team,
    ta.name as away_team,
    th.code as home_code,
    ta.code as away_code,
    m.kickoff_at
  from public.matches m
  join public.competitions c on c.id = m.competition_id and c.is_active
  join public.teams th on th.id = m.home_team_id
  join public.teams ta on ta.id = m.away_team_id
  cross join public.push_tokens pt
  join public.profiles pr on pr.id = pt.user_id
  left join public.notification_prefs np on np.user_id = pt.user_id
  where m.status = 'scheduled'
    and m.kickoff_at > now()
    and m.kickoff_at <= now() + interval '60 minutes'
    and coalesce(np.master and np.reminder_enabled, true)
    and not exists (
      select 1 from public.predictions p
      where p.match_id = m.id and p.user_id = pt.user_id
    )
    and not exists (
      select 1 from public.notification_sends ns
      where ns.match_id = m.id and ns.user_id = pt.user_id and ns.type = 'reminder'
    );
$$;

-- Cibles des notifications de résultats : pronos scorés (passe 1) sur matchs
-- scorés récemment, users équipés d'un token, préférence activée, jamais
-- notifiés pour ce match. La borne 24 h évite une notification de masse
-- rétroactive au déploiement (l'historique déjà scoré n'entre jamais dedans).
-- Uniquement les users AVEC prono scoré (décision actée : pas de notification
-- « le match est fini » à qui n'a pas joué).
create or replace function public.notify_result_targets()
returns table (
  match_id uuid,
  user_id uuid,
  token text,
  locale text,
  home_team text,
  away_team text,
  home_code text,
  away_code text,
  home_score int,
  away_score int,
  points_awarded int
)
language sql
stable
set search_path = ''
as $$
  select
    p.match_id,
    p.user_id,
    pt.token,
    coalesce(pr.locale, 'fr') as locale,
    th.name as home_team,
    ta.name as away_team,
    th.code as home_code,
    ta.code as away_code,
    m.home_score,
    m.away_score,
    p.points_awarded
  from public.predictions p
  join public.matches m on m.id = p.match_id
  join public.teams th on th.id = m.home_team_id
  join public.teams ta on ta.id = m.away_team_id
  join public.push_tokens pt on pt.user_id = p.user_id
  join public.profiles pr on pr.id = p.user_id
  left join public.notification_prefs np on np.user_id = p.user_id
  where m.scored_at is not null
    and m.scored_at >= now() - interval '24 hours'
    and p.scored_at is not null
    and coalesce(np.master and np.results_enabled, true)
    and not exists (
      select 1 from public.notification_sends ns
      where ns.match_id = p.match_id and ns.user_id = p.user_id and ns.type = 'result'
    );
$$;

-- Les fonctions naissent exécutables par public : réservées au service_role
-- (l'EF notify), aucun client ne les appelle.
revoke execute on function public.notify_reminder_targets () from public, anon, authenticated;
revoke execute on function public.notify_result_targets () from public, anon, authenticated;
grant execute on function public.notify_reminder_targets () to service_role;
grant execute on function public.notify_result_targets () to service_role;
