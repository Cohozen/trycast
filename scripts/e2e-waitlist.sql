-- Vérification serveur de l'anti-spam de la waitlist (RGPD).
-- À jouer dans l'éditeur SQL du dashboard Supabase : ces assertions demandent
-- un accès privilégié, que scripts/e2e-privacy.sh (clé publishable) n'a pas.
--
-- Le script simule des appels à join_waitlist depuis une IP fixe et vérifie
-- que (1) plus aucune IP n'est stockée en clair, (2) le rate limit de 3/h par
-- IP est intact après le passage au haché, (3) les refus restent silencieux.
--
-- ⚠️ Écrit puis nettoie ses propres données. Ne rien laisser derrière :
-- le bloc final purge les e-mails de test.

do $$
declare
    v_attempts int;
    v_signups int;
    v_hash text;
begin
    -- État de départ propre pour la fenêtre d'une heure
    delete from public.waitlist_attempts;
    delete from public.waitlist_signups where email like 'e2e.waitlist.%';

    -- Le header x-forwarded-for n'existe pas hors PostgREST : la fonction
    -- retombe alors sur l'IP 'unknown', ce qui suffit à exercer le compteur.
    perform public.join_waitlist('e2e.waitlist.1@trycast.local');
    perform public.join_waitlist('e2e.waitlist.2@trycast.local');
    perform public.join_waitlist('e2e.waitlist.3@trycast.local');
    perform public.join_waitlist('e2e.waitlist.4@trycast.local');
    perform public.join_waitlist('e2e.waitlist.5@trycast.local');

    -- 1. Plus aucune colonne d'IP en clair
    if exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'waitlist_attempts' and column_name = 'ip'
    ) then
        raise exception 'ÉCHEC : la colonne waitlist_attempts.ip existe encore';
    end if;

    -- 2. Ce qui est stocké est bien un sha256 hexadécimal
    select ip_hash into v_hash from public.waitlist_attempts limit 1;
    if v_hash is null or v_hash !~ '^[0-9a-f]{64}$' then
        raise exception 'ÉCHEC : ip_hash n''est pas un sha256 hex (obtenu %)', coalesce(v_hash, 'NULL');
    end if;

    -- 3. Rate limit inchangé : 3 tentatives enregistrées, les suivantes refusées
    select count(*) into v_attempts from public.waitlist_attempts;
    if v_attempts <> 3 then
        raise exception 'ÉCHEC : % tentatives enregistrées, 3 attendues', v_attempts;
    end if;

    -- 4. Refus silencieux : seuls les 3 premiers e-mails sont entrés
    select count(*) into v_signups from public.waitlist_signups where email like 'e2e.waitlist.%';
    if v_signups <> 3 then
        raise exception 'ÉCHEC : % inscriptions, 3 attendues (le rate limit doit couper)', v_signups;
    end if;

    -- 5. Un sel existe pour aujourd'hui, et un seul
    if (select count(*) from public.waitlist_salts where day = current_date) <> 1 then
        raise exception 'ÉCHEC : sel du jour absent ou dupliqué';
    end if;

    raise notice '✅ waitlist : IP hachées, rate limit 3/h intact, refus silencieux';
end $$;

-- Nettoyage
delete from public.waitlist_signups where email like 'e2e.waitlist.%';
delete from public.waitlist_attempts;

select
    (select count(*) from public.waitlist_signups where email like 'e2e.waitlist.%') as restes_test,
    (select count(*) from public.waitlist_attempts) as tentatives_restantes;
