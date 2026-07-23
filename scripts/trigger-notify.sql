-- Déclenchement manuel des jobs de notification (Lot 6), sans attendre pg_cron.
-- À exécuter sur le projet DEV uniquement (SQL editor ou MCP execute_sql),
-- après scripts/seed-test-notifications.sql.
--
-- Même appel que les jobs cron : pg_net + le secret lu dans Vault, jamais en
-- clair. net.http_post est ASYNCHRONE — il rend un id de requête, la réponse
-- arrive quelques secondes plus tard (voir la relecture en fin de fichier).
--
-- Prérequis côté Expo pour qu'un push parte vraiment sur Android : la clé de
-- compte de service FCM V1 doit être déposée sur le projet EAS
-- (`eas credentials` → Android → Push Notifications). Sans elle, chaque ticket
-- revient en `InvalidCredentials` et rien n'arrive sur le téléphone.

-- 1) sync-results : passe 1 du scoring sur le match -602 (pose points et
--    scored_at, ré-agrège les classements). À sauter si le match est déjà scoré.
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

-- 2) notify : rappel de prono (-601) + résultats (-602).
--    À lancer une fois que le match -602 porte bien un scored_at.
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

-- 3) Relecture du run : detail.errors vide et reminders_sent/results_sent > 0
select job, status, started_at, finished_at, detail
from public.job_runs
where job in ('notify', 'sync-results')
order by started_at desc
limit 5;

-- 4) Journal des envois : une ligne par (user, match, type), status 'sent'
select ns.type, ns.status, ns.created_at, m.api_game_id, p.username
from public.notification_sends ns
join public.matches m on m.id = ns.match_id
join public.profiles p on p.id = ns.user_id
order by ns.created_at desc
limit 10;

-- Rejouer une notification déjà envoyée (le claim interdit tout doublon) :
-- delete from public.notification_sends ns
-- using public.matches m
-- where m.id = ns.match_id and m.api_game_id in (-601, -602);
