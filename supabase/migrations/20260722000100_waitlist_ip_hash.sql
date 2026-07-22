-- RGPD : les adresses IP de l'anti-spam de la waitlist ne sont plus stockées
-- en clair. Une IP est une donnée à caractère personnel — même conservée 24 h,
-- elle rend la table `waitlist_attempts` porteuse d'un identifiant direct, ce
-- qui pèse sur le registre des traitements et sur la politique de
-- confidentialité pour un usage purement technique (compter des tentatives).
--
-- On ne stocke plus que sha256(ip || sel du jour). Le hachage préserve
-- l'égalité, donc le comptage par IP est strictement inchangé ; le sel étant
-- tiré au hasard chaque jour et purgé avec les tentatives, un même visiteur
-- n'est plus recoupable d'un jour à l'autre, et une IP connue ne peut pas être
-- confirmée par force brute a posteriori (le sel n'existe déjà plus).
--
-- Effet de bord assumé : à minuit le sel change, donc la fenêtre glissante
-- d'une heure repart à zéro pour les IP à cheval sur le changement de jour
-- (au pire 6 tentatives au lieu de 3 sur ce créneau). Le plafond global de
-- 100/h, lui, n'est pas affecté.

-- Sel du jour. Tiré à la première tentative de la journée, purgé en même temps
-- que les tentatives : il n'existe jamais de sel plus vieux que les données
-- qu'il protège.
create table public.waitlist_salts (
    day date primary key,
    salt text not null default encode(extensions.gen_random_bytes(32), 'hex')
);

alter table public.waitlist_salts enable row level security;

revoke all on public.waitlist_salts from anon, authenticated;
grant all on public.waitlist_salts to service_role;

-- Les tentatives sont des compteurs éphémères (purgés à 24 h) : on ne migre
-- pas l'existant, on repart d'une table vide plutôt que de conserver des IP en
-- clair le temps d'un backfill.
truncate table public.waitlist_attempts;

drop index if exists public.waitlist_attempts_ip_time_idx;
alter table public.waitlist_attempts drop column ip;
alter table public.waitlist_attempts add column ip_hash text not null;

create index waitlist_attempts_ip_hash_time_idx
    on public.waitlist_attempts (ip_hash, created_at);

-- Logique inchangée par rapport à 20260715000100_waitlist.sql (rate limit 3/h
-- par IP, plafond global 100/h, purge > 24 h, refus toujours silencieux) :
-- seule la valeur écrite et comparée devient un haché.
create or replace function public.join_waitlist(email text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_email text := lower(btrim(email));
    -- x-forwarded-for peut contenir « client, proxy1, proxy2 » : on garde le 1er
    v_ip text := coalesce(
        btrim(split_part(
            nullif(current_setting('request.headers', true), '')::json ->> 'x-forwarded-for',
            ',', 1
        )),
        'unknown'
    );
    v_salt text;
    v_ip_hash text;
begin
    if v_email is null or char_length(v_email) > 254
        or v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' then
        return;
    end if;

    delete from public.waitlist_attempts where created_at < now() - interval '24 hours';
    delete from public.waitlist_salts where day < current_date - 1;

    if (select count(*) from public.waitlist_attempts
        where created_at > now() - interval '1 hour') >= 100 then
        return;
    end if;

    -- Sel du jour : créé à la volée puis relu (le default de la table tire les
    -- octets aléatoires, insert ... on conflict do nothing garantit l'unicité
    -- même en cas d'appels concurrents).
    insert into public.waitlist_salts (day) values (current_date) on conflict (day) do nothing;
    select salt into v_salt from public.waitlist_salts where day = current_date;

    v_ip_hash := encode(extensions.digest(v_ip || v_salt, 'sha256'), 'hex');

    if (select count(*) from public.waitlist_attempts
        where ip_hash = v_ip_hash and created_at > now() - interval '1 hour') >= 3 then
        return;
    end if;

    insert into public.waitlist_attempts (ip_hash) values (v_ip_hash);

    -- cible de conflit par nom de contrainte : « on conflict (email) » serait
    -- ambigu avec le paramètre de la fonction (42702)
    insert into public.waitlist_signups (email) values (v_email)
    on conflict on constraint waitlist_signups_email_key do nothing;
end;
$$;
