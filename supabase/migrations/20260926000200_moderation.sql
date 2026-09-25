-- Chantier B de la 1.3.0 : bloquer et signaler un joueur (règle 1.2 de l'App
-- Store, contenu créé par les utilisateurs : pseudos et photos de profil).
--
-- 1) user_blocks : un blocage est une préférence d'affichage, dans un seul sens.
--    Le joueur bloqué apparaît en « Joueur masqué », sans photo, partout où on
--    le croise (rang conservé) : ce masquage est fait par l'app, qui lit ses
--    propres blocages. Côté serveur, seules ses réactions disparaissent pour
--    le bloqueur (compteurs et liste des auteurs, plus bas) : un compteur agrégé
--    ne se corrige pas côté client. Le joueur bloqué n'en sait rien.
--
-- 2) user_reports : un signalement, motif en liste fermée (pseudo, photo),
--    jamais de texte libre. Aucune lecture client : le traitement est manuel,
--    depuis le SQL editor (pas d'app d'administration, décision actée). Un
--    signalement vit jusqu'à son traitement, qui le supprime (moderate_profile,
--    ou un delete s'il est rejeté). Un doublon (même signaleur, même joueur,
--    même motif) est refusé par l'unicité : l'app le traite comme un succès.
--
-- 3) Alerte : chaque signalement envoie un e-mail à contact@trycast.fr par
--    l'API Resend (pg_net, asynchrone : l'insertion n'attend pas l'envoi).
--    L'e-mail ne contient pas l'identité du signaleur. Clé d'API lue dans le
--    Vault à chaque envoi ; absente, rien ne part et le signalement reste.
--    ⚠️ Secret à créer sur CHAQUE projet (clé Resend « envoi seul », domaine
--    trycast.fr) :
--        select vault.create_secret('<clé re_…>', 'resend_api_key');
--
-- 4) moderate_profile : outil de traitement, réservé à service_role et au SQL
--    editor. Remet le pseudo à user_xxxxxxxx avec username_chosen = false (le
--    joueur repasse par l'écran de choix du pseudo à sa prochaine ouverture) et
--    vide avatar_url. Le fichier de la photo se retire dans l'interface Storage
--    (bucket avatars, dossier <user_id>) : le SQL ne peut pas supprimer dans
--    storage.objects.

create extension if not exists pg_net with schema extensions;

-- 1) Blocages -----------------------------------------------------------------

create table public.user_blocks (
    blocker_id uuid not null references public.profiles (id) on delete cascade,
    blocked_id uuid not null references public.profiles (id) on delete cascade,
    created_at timestamptz not null default now(),
    primary key (blocker_id, blocked_id),
    constraint user_blocks_not_self check (blocker_id <> blocked_id)
);

alter table public.user_blocks enable row level security;

create policy "user_blocks_select_own" on public.user_blocks
    for select to authenticated
    using (blocker_id = (select auth.uid()));

create policy "user_blocks_insert_own" on public.user_blocks
    for insert to authenticated
    with check (blocker_id = (select auth.uid()));

create policy "user_blocks_delete_own" on public.user_blocks
    for delete to authenticated
    using (blocker_id = (select auth.uid()));

revoke all on public.user_blocks from anon, authenticated;
grant select, insert, delete on public.user_blocks to authenticated;
grant all on public.user_blocks to service_role;

-- 2) Signalements -------------------------------------------------------------

create table public.user_reports (
    id uuid primary key default gen_random_uuid(),
    reporter_id uuid not null references public.profiles (id) on delete cascade,
    reported_id uuid not null references public.profiles (id) on delete cascade,
    reason text not null check (reason in ('username', 'avatar')),
    created_at timestamptz not null default now(),
    constraint user_reports_unique unique (reporter_id, reported_id, reason),
    constraint user_reports_not_self check (reporter_id <> reported_id)
);

create index user_reports_reported_idx on public.user_reports (reported_id);

alter table public.user_reports enable row level security;

create policy "user_reports_insert_own" on public.user_reports
    for insert to authenticated
    with check (reporter_id = (select auth.uid()));

revoke all on public.user_reports from anon, authenticated;
grant insert on public.user_reports to authenticated;
grant all on public.user_reports to service_role;

-- 3) Alerte e-mail ------------------------------------------------------------

create or replace function public.notify_user_report()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_key text;
    v_username text;
    v_open int;
begin
    select decrypted_secret into v_key
    from vault.decrypted_secrets
    where name = 'resend_api_key';
    if v_key is null then
        return new;
    end if;

    select username into v_username from public.profiles where id = new.reported_id;
    select count(*) into v_open from public.user_reports where reported_id = new.reported_id;

    perform net.http_post(
        url := 'https://api.resend.com/emails',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || v_key
        ),
        body := jsonb_build_object(
            'from', 'TryCast <contact@trycast.fr>',
            'to', jsonb_build_array('contact@trycast.fr'),
            'subject', format(
                'Signalement : %s de %s',
                case new.reason when 'username' then 'pseudo' else 'photo' end,
                v_username
            ),
            'text', format(
                E'Motif : %s\nJoueur : %s (%s)\nSignalements ouverts sur ce joueur : %s\n\n'
                || E'Traiter (SQL editor) :\n'
                || E'  select public.moderate_profile(''%s'', p_username => %s, p_avatar => %s);\n'
                || E'  photo : Storage > avatars > %s\n\n'
                || E'Rejeter :\n'
                || E'  delete from public.user_reports where id = ''%s'';',
                case new.reason when 'username' then 'pseudo' else 'photo' end,
                v_username,
                new.reported_id,
                v_open,
                new.reported_id,
                (new.reason = 'username')::text,
                (new.reason = 'avatar')::text,
                new.reported_id,
                new.id
            )
        ),
        timeout_milliseconds := 10000
    );
    return new;
end;
$$;

revoke execute on function public.notify_user_report() from public, anon, authenticated;

create trigger user_reports_notify
    after insert on public.user_reports
    for each row execute function public.notify_user_report();

-- 4) Traitement ---------------------------------------------------------------

create or replace function public.moderate_profile(
    p_user_id uuid,
    p_username boolean,
    p_avatar boolean
) returns public.profiles
language plpgsql
set search_path = ''
as $$
declare
    v_profile public.profiles;
begin
    update public.profiles
    set username = case when p_username then 'user_' || left(id::text, 8) else username end,
        username_chosen = case when p_username then false else username_chosen end,
        avatar_url = case when p_avatar then null else avatar_url end
    where id = p_user_id
    returning * into v_profile;

    if not found then
        raise exception 'moderate_profile: profil introuvable' using errcode = 'P0002';
    end if;

    delete from public.user_reports
    where reported_id = p_user_id
        and ((p_username and reason = 'username') or (p_avatar and reason = 'avatar'));

    return v_profile;
end;
$$;

revoke execute on function public.moderate_profile(uuid, boolean, boolean)
    from public, anon, authenticated;
grant execute on function public.moderate_profile(uuid, boolean, boolean) to service_role;

-- 5) Réactions des joueurs bloqués, masquées pour le bloqueur -----------------
-- Mêmes corps que 20260919000300, signature inchangée ; seul s'ajoute le
-- filtre `not exists (… user_blocks …)` sur l'auteur de la réaction.

create or replace function public.get_match_league_predictions(
    p_match_id uuid,
    p_league_id uuid
) returns table (
    user_id uuid,
    username text,
    avatar_url text,
    predicted_home_score int,
    predicted_away_score int,
    predicted_bonus_off_home boolean,
    predicted_bonus_off_away boolean,
    points_awarded int,
    is_joker boolean,
    reactions jsonb,
    my_reaction text
)
language sql
stable
security definer
set search_path = ''
as $$
    select
        lm.user_id,
        pr.username,
        pr.avatar_url,
        p.predicted_home_score,
        p.predicted_away_score,
        p.predicted_bonus_off_home,
        p.predicted_bonus_off_away,
        p.points_awarded,
        exists (
            select 1 from public.phase_jokers j
            where j.user_id = lm.user_id and j.match_id = m.id
        ) as is_joker,
        coalesce((
            select jsonb_object_agg(c.reaction, c.n)
            from (
                select r.reaction, count(*) as n
                from public.prediction_reactions r
                where r.league_id = p_league_id
                    and r.match_id = m.id
                    and r.target_user_id = lm.user_id
                    and not exists (
                        select 1 from public.user_blocks b
                        where b.blocker_id = (select auth.uid())
                            and b.blocked_id = r.reactor_id
                    )
                group by r.reaction
            ) c
        ), '{}'::jsonb) as reactions,
        (
            select r.reaction from public.prediction_reactions r
            where r.league_id = p_league_id
                and r.match_id = m.id
                and r.target_user_id = lm.user_id
                and r.reactor_id = (select auth.uid())
        ) as my_reaction
    from public.league_members lm
    join public.leagues l on l.id = lm.league_id
    join public.profiles pr on pr.id = lm.user_id
    join public.matches m
        on m.id = p_match_id
        and m.competition_id = l.competition_id
    left join public.predictions p
        on p.user_id = lm.user_id and p.match_id = m.id
    where lm.league_id = p_league_id
        and public.is_league_member(p_league_id)
        and now() >= m.kickoff_at
    order by p.points_awarded desc nulls last, lower(pr.username);
$$;

create or replace function public.get_prediction_reactors(
    p_league_id uuid,
    p_match_id uuid,
    p_target_user_id uuid
) returns table (
    user_id uuid,
    username text,
    avatar_url text,
    reaction text,
    is_member boolean
)
language sql
stable
security definer
set search_path = ''
as $$
    select
        case when lm.user_id is not null then r.reactor_id end,
        case when lm.user_id is not null then pr.username end,
        case when lm.user_id is not null then pr.avatar_url end,
        r.reaction,
        lm.user_id is not null
    from public.prediction_reactions r
    join public.leagues l on l.id = r.league_id
    join public.matches m
        on m.id = r.match_id
        and m.competition_id = l.competition_id
    join public.profiles pr on pr.id = r.reactor_id
    left join public.league_members lm
        on lm.league_id = r.league_id and lm.user_id = r.reactor_id
    where r.league_id = p_league_id
        and r.match_id = p_match_id
        and r.target_user_id = p_target_user_id
        and public.is_league_member(p_league_id)
        and now() >= m.kickoff_at
        and not exists (
            select 1 from public.user_blocks b
            where b.blocker_id = (select auth.uid())
                and b.blocked_id = r.reactor_id
        )
    -- Ordre d'affichage des réactions, puis la mienne en tête, puis les
    -- membres par pseudo, les anciens membres en dernier.
    order by
        array_position(array['bravo', 'lucky', 'bold', 'laugh'], r.reaction),
        (r.reactor_id = (select auth.uid())) desc,
        (lm.user_id is null),
        lower(pr.username);
$$;
