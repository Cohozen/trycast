-- Planification de l'EF sync-live toutes les 5 minutes via pg_cron + pg_net.
-- Cadence choisie car la source Highlightly accuse un décalage de 3-5 min sur
-- le score in-play (clé Pro) : polling plus fin n'apporterait rien. L'EF
-- early-exit sans appel API hors fenêtre live (kickoff → +3 h) : le tick est
-- quasi gratuit en dehors des matchs en cours.
--
-- ⚠️ Ordre de mise en route (ne pas pousser cette migration avant le deploy,
--    sinon le premier tick frappe une URL 404) :
--   1. supabase secrets set SYNC_LIVE_SECRET=<valeur>
--   2. supabase functions deploy sync-live   (bloc verify_jwt=false déjà en place)
--   3. select vault.create_secret('<valeur>', 'sync_live_secret');  -- même valeur
--   4. supabase db push (cette migration)
--
-- cron.schedule est idempotent sur le nom du job. Extensions pg_cron/pg_net
-- déjà créées par 20260705000300.

select cron.schedule(
  'sync-live-5min',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := 'https://bmdzadvugtkclnqjpndr.supabase.co/functions/v1/sync-live',
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
