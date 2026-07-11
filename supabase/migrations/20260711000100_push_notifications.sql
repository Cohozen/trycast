-- Lot 6 : notifications push — tokens d'appareil + préférences par type.
--
-- push_tokens : une ligne = un token Expo Push (couple appareil × installation),
-- plusieurs lignes possibles par user (multi-device). Unicité sur le token :
-- quand un autre compte se connecte sur le même téléphone, la ligne est
-- réaffectée au nouveau compte (pas de push croisés). Cette réaffectation
-- touche la ligne d'un AUTRE user → impossible en upsert PostgREST sous RLS,
-- d'où l'écriture exclusivement par RPC security definer (même décision que
-- les ligues : create_league/join_league). Lecture : chacun voit ses tokens.
--
-- notification_prefs : une ligne par user, accès direct PostgREST (upsert own).
-- Absence de ligne = tout activé — les sélections serveur font
-- coalesce(master and <type>_enabled, true). Extensible : un type futur
-- (« Activité de ligue », « Invitations ») = une colonne add column ... default true.

create table public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  -- Token Expo Push (« ExponentPushToken[...] ») : valeur-capacité, jamais
  -- exposée à d'autres users
  token text not null unique check (char_length(token) between 10 and 200),
  platform text not null check (platform in ('android', 'ios')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Chargement des tokens d'un user par les sélections de l'EF notify
create index push_tokens_user_idx on public.push_tokens (user_id);

create table public.notification_prefs (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  master boolean not null default true,
  reminder_enabled boolean not null default true,
  results_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

create or replace function public.set_push_tokens_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke execute on function public.set_push_tokens_updated_at() from anon, authenticated, public;

create trigger push_tokens_set_updated_at
  before update on public.push_tokens
  for each row execute function public.set_push_tokens_updated_at();

create or replace function public.set_notification_prefs_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke execute on function public.set_notification_prefs_updated_at() from anon, authenticated, public;

create trigger notification_prefs_set_updated_at
  before update on public.notification_prefs
  for each row execute function public.set_notification_prefs_updated_at();

-- Enregistrement (ou réaffectation) du token de l'appareil courant.
-- Idempotent : re-enregistrer le même token met à jour user_id/platform.
create or replace function public.register_push_token(p_token text, p_platform text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_uid uuid := (select auth.uid());
begin
    if v_uid is null then
        raise exception 'register_push_token: non authentifié' using errcode = '42501';
    end if;
    if p_token is null or char_length(p_token) not between 10 and 200 then
        raise exception 'register_push_token: token invalide' using errcode = '23514';
    end if;
    if p_platform is null or p_platform not in ('android', 'ios') then
        raise exception 'register_push_token: plateforme invalide' using errcode = '23514';
    end if;
    insert into public.push_tokens (user_id, token, platform)
    values (v_uid, p_token, p_platform)
    on conflict (token) do update
      set user_id = excluded.user_id,
          platform = excluded.platform,
          updated_at = now();
end;
$$;

-- Déconnexion : retire le token de l'appareil courant, quel que soit le compte
-- qui le détient (le token est une valeur-capacité que seul l'appareil connaît).
create or replace function public.unregister_push_token(p_token text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
    if (select auth.uid()) is null then
        raise exception 'unregister_push_token: non authentifié' using errcode = '42501';
    end if;
    delete from public.push_tokens where token = p_token;
end;
$$;

-- Les fonctions naissent exécutables par public
revoke execute on function public.register_push_token (text, text) from public, anon;
revoke execute on function public.unregister_push_token (text) from public, anon;
grant execute on function public.register_push_token (text, text) to authenticated;
grant execute on function public.unregister_push_token (text) to authenticated;

alter table public.push_tokens enable row level security;
alter table public.notification_prefs enable row level security;

create policy "push_tokens_select_own"
  on public.push_tokens for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- Pas de policy insert/update/delete sur push_tokens : écriture par RPC uniquement.

create policy "notification_prefs_select_own"
  on public.notification_prefs for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "notification_prefs_insert_own"
  on public.notification_prefs for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "notification_prefs_update_own"
  on public.notification_prefs for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Pas de policy DELETE sur notification_prefs : les préférences se modifient.

-- Grants : default privileges legacy du projet dev (grant all à anon/authenticated
-- sur toute nouvelle table) → revoke tout puis n'accorder que l'usage réel.
-- L'upsert PostgREST des prefs rejoue toutes les colonnes du payload dans le
-- ON CONFLICT DO UPDATE, d'où user_id aussi présent dans le grant update.
revoke all on public.push_tokens from anon, authenticated;
grant select on public.push_tokens to authenticated;
grant all on public.push_tokens to service_role;

revoke all on public.notification_prefs from anon, authenticated;
grant select on public.notification_prefs to authenticated;
grant insert (user_id, master, reminder_enabled, results_enabled)
  on public.notification_prefs to authenticated;
grant update (user_id, master, reminder_enabled, results_enabled)
  on public.notification_prefs to authenticated;
grant all on public.notification_prefs to service_role;
