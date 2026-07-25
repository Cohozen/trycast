-- Boîte de réception des notifications : historique consultable dans l'app.
--
-- notification_sends était un journal serveur pur (dédup des envois + suivi des
-- receipts Expo). Il devient aussi la source de l'écran Notifications : mêmes
-- lignes, quatre colonnes de plus. Pas de table parallèle — une notification
-- reçue est exactement une ligne d'envoi, dupliquer inviterait la divergence.
--
-- RÈGLE D'OR : une ligne appartient à la boîte de réception si et seulement si
-- title is not null. Le contenu est écrit par l'EF notify au moment du passage
-- en status='sent' — donc une ligne 'pending' orpheline (crash entre le claim
-- et l'envoi) ou 'error' n'apparaît jamais dans l'app. Le client n'a ainsi
-- besoin de voir ni status, ni ticket_ids, ni receipt_checked_at.

alter table public.notification_sends
  add column title text,
  add column body text,
  -- Deep link du tap, repris de data.url du push. La navigation reste soumise
  -- à l'allowlist client (use-notification-observer.ts) : cette colonne est une
  -- donnée, pas une autorisation.
  add column url text,
  add column read_at timestamptz;

-- Liste de l'écran : mes notifications, récentes d'abord
create index notification_sends_inbox_idx
  on public.notification_sends (user_id, created_at desc)
  where title is not null;

-- Pastille de la cloche et badge d'icône : compte des non-lues
create index notification_sends_unread_idx
  on public.notification_sends (user_id)
  where title is not null and read_at is null;

create policy "notification_sends_select_own"
  on public.notification_sends for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "notification_sends_update_own"
  on public.notification_sends for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Pas de policy insert/delete : seule l'EF notify (service_role) crée les
-- lignes, et l'historique ne s'efface pas à la main.

-- Grants colonne par colonne (modèle notification_prefs) : le client lit le
-- contenu et ne peut écrire que read_at — impossible de réécrire un titre ou
-- de maquiller un statut d'envoi. user_id est lisible pour que les filtres
-- PostgREST d'un UPDATE puissent le référencer.
grant select (id, user_id, type, title, body, url, read_at, created_at)
  on public.notification_sends to authenticated;
grant update (read_at) on public.notification_sends to authenticated;

-- Nombre de non-lues par user, pour le champ badge du push (iOS). Les agrégats
-- groupés ne s'expriment pas en PostgREST, d'où la RPC — réservée au
-- service_role comme notify_*_targets.
create or replace function public.notify_unread_counts(p_user_ids uuid[])
returns table (user_id uuid, unread int)
language sql
stable
set search_path = ''
as $$
  select ns.user_id, count(*)::int as unread
  from public.notification_sends ns
  where ns.user_id = any (p_user_ids)
    and ns.title is not null
    and ns.read_at is null
  group by ns.user_id;
$$;

revoke execute on function public.notify_unread_counts (uuid[]) from public, anon, authenticated;
grant execute on function public.notify_unread_counts (uuid[]) to service_role;
