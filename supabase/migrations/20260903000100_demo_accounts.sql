-- Comptes de démonstration : présents pour les relecteurs des stores, absents
-- des classements généraux.
--
-- Google (et Apple le jour venu) exige un compte de test fonctionnel, et le
-- relit à CHAQUE mise à jour : ce compte est un meuble permanent, pas une
-- donnée de passage. Mais c'est un compte comme un autre — sans marqueur, il
-- apparaît au classement général aux côtés des vrais joueurs, avec des points
-- semés qu'il n'a pas gagnés.
--
-- Le marqueur vit sur `profiles` et non sur `standings` : un compte de
-- démonstration doit garder ses points (le relecteur ouvre l'app sur un profil
-- et une ligue peuplés), il ne doit simplement pas concourir au général. Sa
-- ligue privée continue de le classer normalement — c'est justement ce que le
-- relecteur regarde.
--
-- Sécurité : aucun `grant update (is_demo)` n'est accordé. Les droits sur
-- `profiles` sont donnés colonne par colonne depuis 20260705000500, donc un
-- client authentifié ne peut pas se marquer lui-même pour disparaître du
-- classement. Seul `service_role` (scripts/seed-demo-account.mjs) l'écrit.

alter table public.profiles
    add column if not exists is_demo boolean not null default false;

comment on column public.profiles.is_demo is
    'Compte de démonstration pour les relecteurs des stores : exclu des classements généraux, mais classé normalement dans ses ligues.';

-- Index partiel : les comptes de démonstration se comptent sur les doigts
-- d''une main, inutile d''indexer les millions de `false`.
create index if not exists profiles_is_demo_idx on public.profiles (id) where is_demo;

-- Le classement général les ignore. Signature inchangée : `create or replace`
-- conserve les grants posés par la migration d'origine.
create or replace function public.get_global_leaderboard(
    p_competition_id uuid,
    p_limit int default 50,
    p_offset int default 0
) returns table (
    rank bigint,
    user_id uuid,
    username text,
    avatar_url text,
    total_points int,
    exact_scores int,
    predictions_scored int
)
language sql
stable
security invoker
set search_path = ''
as $$
    select
        rank() over (
            order by s.total_points desc, s.exact_scores desc, s.predictions_scored asc
        ) as rank,
        s.user_id,
        pr.username,
        pr.avatar_url,
        s.total_points,
        s.exact_scores,
        s.predictions_scored
    from public.standings s
    join public.profiles pr on pr.id = s.user_id
    where s.competition_id = p_competition_id
      and not pr.is_demo
    order by rank, lower(pr.username)
    limit least(greatest(coalesce(p_limit, 50), 1), 100)
    offset greatest(coalesce(p_offset, 0), 0);
$$;
