-- Lot 9 : les 4 jobs pg_cron ne portent plus l'URL du projet en dur.
--
-- Jusqu'ici chaque migration de planification (20260705000300, 20260707000300,
-- 20260711000300, 20260712000600) écrivait `https://bmdzadvugtkclnqjpndr.…`
-- dans le corps du job. Tant que le projet était unique, c'était sans
-- conséquence. Avec la scission dev / prod, rejouer ces migrations sur un
-- projet neuf y planterait 4 crons qui frappent la PRODUCTION toutes les
-- 5 à 10 minutes — exactement l'accident qu'on ne veut pas.
--
-- La base des Edge Functions est donc lue dans Vault à chaque tick, comme
-- l'était déjà le secret d'authentification. Chaque projet porte sa propre
-- valeur, les migrations deviennent portables.
--
-- ⚠️ Sur un projet neuf, créer le secret AVANT `supabase db push` :
--      select vault.create_secret(
--        'https://<ref>.supabase.co', 'edge_functions_base_url');
--    Sans lui, l'URL construite est NULL : le tick échoue sans rien appeler
--    (pas d'appel vers un autre projet — le défaut est sûr), jusqu'à ce que le
--    secret existe.
--
-- cron.schedule est idempotent sur le nom du job : re-planifier écrase la
-- définition précédente, il n'y a rien à désinscrire.

select cron.schedule(
  'sync-fixtures-daily',
  '0 5 * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets
            where name = 'edge_functions_base_url') || '/functions/v1/sync-fixtures',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-sync-secret', (select decrypted_secret from vault.decrypted_secrets
                        where name = 'sync_fixtures_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $$
);

select cron.schedule(
  'sync-results-10min',
  '*/10 * * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets
            where name = 'edge_functions_base_url') || '/functions/v1/sync-results',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-sync-secret', (select decrypted_secret from vault.decrypted_secrets
                        where name = 'sync_results_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $$
);

select cron.schedule(
  'sync-live-5min',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets
            where name = 'edge_functions_base_url') || '/functions/v1/sync-live',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-sync-secret', (select decrypted_secret from vault.decrypted_secrets
                        where name = 'sync_live_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $$
);

select cron.schedule(
  'notify-10min',
  '3-53/10 * * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets
            where name = 'edge_functions_base_url') || '/functions/v1/notify',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-sync-secret', (select decrypted_secret from vault.decrypted_secrets
                        where name = 'notify_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $$
);
