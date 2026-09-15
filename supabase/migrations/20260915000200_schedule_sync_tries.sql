-- Planification de sync-tries (2026-09-15) : import des essais depuis Wikipedia.
--
-- Toutes les 30 minutes, décalé de sync-results (*/10) et de notify (3-53/10) :
-- les encadrés Wikipedia se remplissent en quelques heures après le match, un
-- rythme plus serré n'apporterait rien. Sans match en attente d'essais, l'EF
-- sort sans appeler Wikipedia ni écrire dans job_runs.
--
-- Même forme que 20260727000100 : URL et secret lus dans Vault à chaque tick,
-- aucun ref de projet en dur.
--
-- ⚠️ Avant `supabase db push`, sur chaque projet :
--      supabase secrets set SYNC_TRIES_SECRET=<valeur>
--      select vault.create_secret('<même valeur>', 'sync_tries_secret');
--      supabase functions deploy sync-tries
--    Sans le secret Vault, l'en-tête est NULL et l'EF répond 401 : le défaut est
--    sûr, mais rien n'est importé.

select cron.schedule(
  'sync-tries-30min',
  '17,47 * * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets
            where name = 'edge_functions_base_url') || '/functions/v1/sync-tries',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-sync-secret', (select decrypted_secret from vault.decrypted_secrets
                        where name = 'sync_tries_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $$
);
