-- Lot 6 : planification de l'EF notify toutes les 10 minutes via pg_cron + pg_net.
-- Tick décalé de 3 minutes après sync-results (*/10) : un match scoré au tick
-- résultats est notifié ~3 min plus tard. L'EF early-exit sans écriture quand
-- il n'y a ni cible ni receipt à vérifier : le tick est quasi gratuit.
--
-- ⚠️ Ordre de mise en route :
--   1. supabase secrets set NOTIFY_SECRET=…
--   2. supabase functions deploy notify
--   3. Créer le secret côté Postgres (même valeur que NOTIFY_SECRET) :
--        select vault.create_secret('<valeur>', 'notify_secret');
--   4. supabase db push (cette migration) — jamais avant le deploy, sinon le
--      premier tick frapperait une URL 404.
--
-- Le secret est lu dans Vault à chaque tick (jamais en clair dans une migration).
-- cron.schedule est idempotent sur le nom du job (re-planification).
-- Extensions pg_cron/pg_net déjà créées par la migration 20260705000300.

select cron.schedule(
  'notify-10min',
  '3-53/10 * * * *',
  $$
  select net.http_post(
    url := 'https://bmdzadvugtkclnqjpndr.supabase.co/functions/v1/notify',
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
