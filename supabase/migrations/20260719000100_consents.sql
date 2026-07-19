-- Lot 7 (RGPD) : consentements de l'utilisateur, historisés (append-only).
-- Chaque changement d'un consentement insère une nouvelle ligne : on conserve
-- ainsi la date de recueil de chaque état (exigence RGPD). L'état courant d'un
-- type = la ligne la plus récente pour (user_id, type). Aucun update/delete :
-- l'historique est immuable côté client.
--
-- Types prévus : 'communications' (e-mails produit / actu). Extensible plus
-- tard ('analytics'…) sans migration de données grâce au modèle append-only.

create table public.consents (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users (id) on delete cascade,
    type text not null check (type in ('communications')),
    granted boolean not null,
    created_at timestamptz not null default now()
);

-- Lecture du dernier état par (user, type)
create index consents_user_type_time_idx
    on public.consents (user_id, type, created_at desc);

alter table public.consents enable row level security;

-- Chacun ne voit et n'écrit que ses propres consentements. Pas de policy
-- UPDATE/DELETE : append-only (la suppression du compte cascade via auth.users).
create policy "consents_select_own"
    on public.consents for select
    to authenticated
    using ((select auth.uid()) = user_id);

create policy "consents_insert_own"
    on public.consents for insert
    to authenticated
    with check ((select auth.uid()) = user_id);

-- Default privileges legacy du projet dev : revoke + regrant explicites.
-- L'accès client se limite à select/insert (RLS porte la restriction par ligne).
revoke all on public.consents from anon, authenticated;
grant select, insert on public.consents to authenticated;
grant all on public.consents to service_role;
