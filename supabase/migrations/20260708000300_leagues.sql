-- Lot 5 : ligues privées entre amis. Une ligue appartient à une compétition et
-- n'est visible que de ses membres ; on la rejoint uniquement par code
-- d'invitation via la RPC join_league (migration suivante) — le code n'est
-- jamais résoluble par un select, pas d'énumération possible.
--
-- Récursion RLS : une policy de league_members qui interroge league_members
-- (ou leagues, dont la policy re-interroge league_members) boucle («infinite
-- recursion detected in policy»). Les helpers security definer
-- is_league_member / is_league_owner court-circuitent la RLS pour casser le
-- cycle — toujours passer par eux dans les policies de ces deux tables.

create type public.league_role as enum ('owner', 'member');

create table public.leagues (
    id uuid primary key default gen_random_uuid(),
    name text not null check (char_length(btrim(name)) between 3 and 40),
    -- 8 chars, alphabet sans ambiguïté visuelle (pas de 0/O/1/I/L),
    -- généré par create_league
    invite_code text not null unique check (invite_code ~ '^[A-HJ-KM-NP-Z2-9]{8}$'),
    -- owner supprimé → sa ligue disparaît avec lui (choix MVP, transfert = v2)
    owner_id uuid not null references public.profiles (id) on delete cascade,
    competition_id uuid not null references public.competitions (id) on delete cascade,
    created_at timestamptz not null default now()
);

create table public.league_members (
    league_id uuid not null references public.leagues (id) on delete cascade,
    user_id uuid not null references public.profiles (id) on delete cascade,
    role public.league_role not null default 'member',
    joined_at timestamptz not null default now(),
    primary key (league_id, user_id)
);

-- « Mes ligues » (la PK couvre déjà league_id en tête)
create index league_members_user_idx on public.league_members (user_id);

create or replace function public.is_league_member(p_league_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select exists (
        select 1 from public.league_members
        where league_id = p_league_id and user_id = (select auth.uid())
    );
$$;

create or replace function public.is_league_owner(p_league_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select exists (
        select 1 from public.leagues
        where id = p_league_id and owner_id = (select auth.uid())
    );
$$;

-- Les fonctions naissent exécutables par public
revoke execute on function public.is_league_member (uuid) from public, anon;
revoke execute on function public.is_league_owner (uuid) from public, anon;
grant execute on function public.is_league_member (uuid) to authenticated;
grant execute on function public.is_league_owner (uuid) to authenticated;

alter table public.leagues enable row level security;
alter table public.league_members enable row level security;

-- Une ligue n'est visible que de ses membres (l'owner en est membre via
-- create_league). Pas de policy insert : création uniquement par la RPC.
create policy "leagues_select_member" on public.leagues
    for select to authenticated
    using (public.is_league_member(id));

create policy "leagues_update_owner" on public.leagues
    for update to authenticated
    using ((select auth.uid()) = owner_id)
    with check ((select auth.uid()) = owner_id);

create policy "leagues_delete_owner" on public.leagues
    for delete to authenticated
    using ((select auth.uid()) = owner_id);

-- Le roster n'est visible que des membres de la même ligue
create policy "league_members_select_same_league" on public.league_members
    for select to authenticated
    using (public.is_league_member(league_id));

-- Quitter (soi-même) ou être exclu (par l'owner). Le row owner n'est jamais
-- supprimable directement : l'owner ne quitte pas sa ligue, il la supprime
-- (cascade du delete de leagues).
create policy "league_members_delete_self_or_owner" on public.league_members
    for delete to authenticated
    using (
        role <> 'owner'
        and ((select auth.uid()) = user_id or public.is_league_owner(league_id))
    );

-- Default privileges legacy du projet dev : revoke + regrant explicites.
-- Pas de grant insert : create_league / join_league (security definer) passent
-- outre ; update limité au renommage.
revoke all on public.leagues, public.league_members from anon, authenticated;
grant select, delete on public.leagues to authenticated;
grant update (name) on public.leagues to authenticated;
grant select, delete on public.league_members to authenticated;
grant all on public.leagues, public.league_members to service_role;
