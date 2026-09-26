-- E2E de l'e-mail de bienvenue (migration 20260926000400_welcome_email.sql), sans seed :
--   supabase db query --linked -f scripts/e2e-welcome.sql
--
-- Tout se passe dans une transaction annulée : la file de pg_net est
-- transactionnelle, donc aucun e-mail ne part. On lit la requête en file dans
-- net.http_request_queue. Destinataire : delivered@resend.dev, l'adresse de test
-- de Resend. Exige le secret resend_api_key dans le Vault du projet.
-- Aucune erreur = OK ; un cas raté lève une exception « KO : … ».

begin;
do $$
declare
    v_uid uuid := gen_random_uuid();
    v_demo uuid := gen_random_uuid();
    v_n int;
    v_body jsonb;
begin
    insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
    values (v_uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
            'delivered@resend.dev', '{}', now(), now()),
           (v_demo, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
            'e2e.welcome.demo@trycast.local', '{}', now(), now());
    if (select username_chosen from public.profiles where id = v_uid) then
        raise exception 'KO : un compte sans pseudo devrait naître avec username_chosen = false';
    end if;

    -- 1) Premier choix du pseudo par la RPC, sous l'identité de l'utilisateur
    perform set_config('request.jwt.claims', json_build_object('sub', v_uid, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.claim_username('E2eWelcome1');
    reset role;

    select count(*), max(convert_from(body, 'UTF8')::jsonb::text)::jsonb into v_n, v_body
    from net.http_request_queue
    where url = 'https://api.resend.com/emails'
      and convert_from(body, 'UTF8')::jsonb -> 'template' ->> 'id' = 'welcome';
    if v_n <> 1 then raise exception 'KO : 1 envoi attendu après claim_username, % trouvé(s)', v_n; end if;
    if v_body -> 'to' ->> 0 <> 'delivered@resend.dev'
       or v_body -> 'template' -> 'variables' ->> 'USERNAME' <> 'E2eWelcome1'
       or v_body ->> 'from' <> 'TryCast <noreply@trycast.fr>' then
        raise exception 'KO : corps inattendu %', v_body;
    end if;

    -- 2) Rejouer claim_username (renommage) ne renvoie rien
    set local role authenticated;
    perform public.claim_username('E2eWelcome2');
    reset role;
    select count(*) into v_n from net.http_request_queue
    where convert_from(body, 'UTF8')::jsonb -> 'template' ->> 'id' = 'welcome';
    if v_n <> 1 then raise exception 'KO : un renommage a renvoyé la bienvenue (% envois)', v_n; end if;

    -- 3) Compte de démo : username_chosen et is_demo dans le même update, rien ne part
    update public.profiles set username_chosen = true, is_demo = true where id = v_demo;
    select count(*) into v_n from net.http_request_queue
    where convert_from(body, 'UTF8')::jsonb -> 'template' ->> 'id' = 'welcome';
    if v_n <> 1 then raise exception 'KO : un compte de démo a reçu la bienvenue (% envois)', v_n; end if;

    raise notice 'OK : bienvenue envoyée une fois, ni au renommage ni au compte de démo';
end;
$$;
rollback;
