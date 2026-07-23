-- Connexion Google (2026-07-23) : un compte créé par un fournisseur OAuth
-- n'apporte pas de pseudo. handle_new_user retombait déjà sur
-- 'user_' || left(id, 8), mais rien ne distinguait ce repli d'un pseudo
-- réellement choisi — or le pseudo est ce que voient les autres dans les ligues
-- et les classements : on ne veut pas de « user_a3f21b04 » en tête de classement.
--
-- D'où username_chosen : false uniquement quand le pseudo a été subi. L'app s'en
-- sert comme d'une porte — première connexion OAuth ⇒ écran de choix du pseudo
-- avant l'accueil. La colonne n'est volontairement pas dans les grants colonne
-- de authenticated (cf. 20260705000500) : seule la RPC ci-dessous peut la
-- passer à true, le client ne peut pas s'auto-déclarer en règle.
--
-- Les comptes existants ont tous choisi leur pseudo à l'inscription : default true.

alter table public.profiles
    add column username_chosen boolean not null default true;

-- Reprise du trigger de création de profil : seule la valeur de username_chosen
-- change. `username` n'est présent dans raw_user_meta_data que pour le parcours
-- e-mail (options.data du signUp) ; Google y met full_name / picture / email,
-- jamais de pseudo.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, username, username_chosen)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'username', 'user_' || left(new.id::text, 8)),
    (new.raw_user_meta_data ->> 'username') is not null
  );
  return new;
end;
$$;

-- create or replace conserve les privilèges existants ; on réaffirme le revoke
-- de 20260704000200 pour que la lecture de cette migration suffise.
revoke execute on function public.handle_new_user() from anon, authenticated, public;

-- Revendication du pseudo à la première connexion OAuth. security definer
-- uniquement pour écrire username_chosen, que les grants colonne interdisent au
-- client. Aucune validation de format ici : la contrainte username_format et
-- l'index unique profiles_username_lower_idx font le travail et remontent les
-- errcodes 23514 / 23505 que toProfileMessageKey sait déjà traduire
-- (src/features/profile/errors.ts) — dupliquer les règles ici les ferait diverger.
--
-- Volontairement rejouable : rien n'interdit d'appeler la RPC sur un profil dont
-- le pseudo est déjà choisi. Un garde-fou « une seule fois » ne protégerait rien
-- (renommer son pseudo est déjà permis par grant update (username)) et ferait
-- échouer un simple ré-appui après un aléa réseau.
create or replace function public.claim_username(candidate text)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_uid uuid := (select auth.uid());
    v_profile public.profiles;
begin
    if v_uid is null then
        raise exception 'claim_username: non authentifié'
            using errcode = '42501';
    end if;

    update public.profiles
    set username = candidate,
        username_chosen = true
    where id = v_uid
    returning * into v_profile;

    if not found then
        raise exception 'claim_username: profil introuvable'
            using errcode = 'P0002';
    end if;

    return v_profile;
end;
$$;

-- Les fonctions naissent exécutables par public
revoke execute on function public.claim_username(text) from public, anon;
grant execute on function public.claim_username(text) to authenticated;
