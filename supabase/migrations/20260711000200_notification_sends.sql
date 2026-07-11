-- Lot 6 : journal des notifications envoyées + sélections des cibles.
--
-- notification_sends déduplique les envois : une ligne = une notification
-- (user × match × type), posée par l'EF notify AVANT l'appel à l'Expo Push API
-- (claim-first sur la contrainte unique — un crash entre claim et envoi perd
-- la notification, ce qui vaut mieux qu'un double envoi ; diagnostic via
-- status='pending'). La clé (user, match, 'result') interdit gratuitement
-- tout re-push quand la passe 2 du scoring réécrit les points.
-- Table serveur pure : RLS sans policy, service_role uniquement (modèle job_runs).
--
-- Les sélections de cibles vivent en SQL (RPC appelées par l'EF notify en
-- service_role) : les jointures tokens × prefs × anti-joins ne s'expriment pas
-- proprement en supabase-js, et le SQL versionné en migration reste testable —
-- même décision que apply_match_scores.

create table public.notification_sends (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  match_id uuid not null references public.matches (id) on delete cascade,
  type text not null check (type in ('reminder', 'result')),
  status text not null default 'pending'
    check (status in ('pending', 'sent', 'error')),
  -- Ids de tickets Expo (un par token du user), vérifiés au tick suivant
  ticket_ids jsonb,
  receipt_checked_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, match_id, type)
);

-- Phase receipts de l'EF notify : envois récents pas encore vérifiés
create index notification_sends_receipts_idx
  on public.notification_sends (created_at)
  where status = 'sent' and receipt_checked_at is null;

alter table public.notification_sends enable row level security;
revoke all on public.notification_sends from anon, authenticated;
grant all on public.notification_sends to service_role;

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
