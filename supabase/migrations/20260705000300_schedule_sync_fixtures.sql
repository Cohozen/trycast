-- Lot 2 : planification quotidienne de sync-fixtures (05:00 UTC) via pg_cron + pg_net.
--
-- ⚠️ Ordre de mise en route (documenté dans le README) :
--   1. supabase secrets set API_SPORTS_KEY=… SYNC_FIXTURES_SECRET=…
--   2. supabase functions deploy sync-fixtures
--   3. Créer le secret côté Postgres (même valeur que SYNC_FIXTURES_SECRET) :
--        select vault.create_secret('<valeur>', 'sync_fixtures_secret');
--   4. supabase db push (cette migration) — jamais avant le deploy, sinon le
--      premier tick frapperait une URL 404.
--
-- Le secret est lu dans Vault à chaque tick (jamais en clair dans une migration).
-- cron.schedule est idempotent sur le nom du job (re-planification).

create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

select cron.schedule(
  'sync-fixtures-daily',
  '0 5 * * *',
  $$
  select net.http_post(
    url := 'https://bmdzadvugtkclnqjpndr.supabase.co/functions/v1/sync-fixtures',
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
