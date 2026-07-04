-- Lot 1 : profils utilisateurs (1:1 avec auth.users)

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null,
  created_at timestamptz not null default now(),
  constraint username_format check (
    char_length(username) between 3 and 20
    and username ~ '^[A-Za-z0-9_]+$'
  )
);

-- Unicité insensible à la casse
create unique index profiles_username_lower_idx on public.profiles (lower(username));

alter table public.profiles enable row level security;

-- Tout utilisateur connecté voit les profils (pseudos affichés dans ligues/classements)
create policy "profiles_select_authenticated"
  on public.profiles for select
  to authenticated
  using (true);

-- Chacun ne modifie que son propre profil (username uniquement : id est PK,
-- created_at n'est jamais exposé à l'édition côté app)
create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Pas de policy INSERT/DELETE : création via trigger, suppression via cascade auth.users

-- Création automatique du profil au signup (username passé dans options.data)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'username', 'user_' || left(new.id::text, 8))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Vérification de disponibilité du username avant signup (appelable anonymement)
create or replace function public.username_available(candidate text)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select not exists (
    select 1 from public.profiles where lower(username) = lower(candidate)
  );
$$;

grant execute on function public.username_available(text) to anon, authenticated;
