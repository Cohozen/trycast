-- Lot 4 : planification de sync-results toutes les 10 minutes via pg_cron + pg_net.
-- L'EF early-exit sans écriture ni appel API quand aucun match n'est actionnable :
-- le tick est quasi gratuit hors jours de match.
--
-- ⚠️ Ordre de mise en route (documenté dans le README) :
--   1. supabase secrets set SYNC_RESULTS_SECRET=…
--   2. supabase functions deploy sync-results
--   3. Créer le secret côté Postgres (même valeur que SYNC_RESULTS_SECRET) :
--        select vault.create_secret('<valeur>', 'sync_results_secret');
--   4. supabase db push (cette migration) — jamais avant le deploy, sinon le
--      premier tick frapperait une URL 404.
--
-- Le secret est lu dans Vault à chaque tick (jamais en clair dans une migration).
-- cron.schedule est idempotent sur le nom du job (re-planification).
-- Extensions pg_cron/pg_net déjà créées par la migration 20260705000300.

select cron.schedule(
  'sync-results-10min',
  '*/10 * * * *',
  $$
  select net.http_post(
    url := 'https://bmdzadvugtkclnqjpndr.supabase.co/functions/v1/sync-results',
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
