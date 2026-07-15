-- Site vitrine (web/) : liste d'attente de la beta. Les emails ne sont jamais
-- lisibles ni modifiables par les clients : aucune policy RLS, seule la RPC
-- join_waitlist (security definer, exécutable par anon) écrit dans la table.
--
-- Anti-spam côté serveur (protection des quotas — le client peut être
-- contourné, un bot peut appeler la RPC directement) :
--   - rate limit par IP : 3 tentatives/heure, IP lue dans les headers
--     PostgREST (x-forwarded-for) ;
--   - plafond global : 100 tentatives/heure toutes IP confondues, borne dure
--     même en cas d'attaque distribuée ;
--   - purge opportuniste des tentatives > 24 h à chaque appel (pas de cron).
-- Tous les refus (format, rate limit, doublon) sont silencieux : la RPC
-- retourne void dans tous les cas — pas d'énumération d'emails, aucun signal
-- exploitable par un attaquant.

create table public.waitlist_signups (
    id uuid primary key default gen_random_uuid(),
    email text not null unique
        check (email = lower(btrim(email)) and email ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$'),
    created_at timestamptz not null default now()
);

create table public.waitlist_attempts (
    id uuid primary key default gen_random_uuid(),
    ip text not null,
    created_at timestamptz not null default now()
);

-- rate limit par IP + purge par ancienneté
create index waitlist_attempts_ip_time_idx on public.waitlist_attempts (ip, created_at);
create index waitlist_attempts_time_idx on public.waitlist_attempts (created_at);

-- RLS sans aucune policy : tout accès direct client est refusé, seule la RPC
-- (security definer) passe.
alter table public.waitlist_signups enable row level security;
alter table public.waitlist_attempts enable row level security;

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
begin
    if v_email is null or char_length(v_email) > 254
        or v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' then
        return;
    end if;

    delete from public.waitlist_attempts where created_at < now() - interval '24 hours';

    if (select count(*) from public.waitlist_attempts
        where created_at > now() - interval '1 hour') >= 100 then
        return;
    end if;

    if (select count(*) from public.waitlist_attempts
        where ip = v_ip and created_at > now() - interval '1 hour') >= 3 then
        return;
    end if;

    insert into public.waitlist_attempts (ip) values (v_ip);

    -- cible de conflit par nom de contrainte : « on conflict (email) » serait
    -- ambigu avec le paramètre de la fonction (42702)
    insert into public.waitlist_signups (email) values (v_email)
    on conflict on constraint waitlist_signups_email_key do nothing;
end;
$$;

revoke execute on function public.join_waitlist (text) from public;
grant execute on function public.join_waitlist (text) to anon, authenticated;

-- Default privileges legacy du projet dev : revoke + regrant explicites.
-- Aucun grant client : lecture/écriture réservées à la RPC et au service_role.
revoke all on public.waitlist_signups, public.waitlist_attempts from anon, authenticated;
grant all on public.waitlist_signups, public.waitlist_attempts to service_role;
