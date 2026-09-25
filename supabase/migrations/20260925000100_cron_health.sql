-- 1.3.0 : alerte sur les crons en échec, par un moniteur Sentry Crons.
--
-- Pourquoi : aucune surveillance ne lisait l'état des jobs. En prod, les crons
-- ont échoué en silence pendant un mois pour un secret Vault manquant.
--
-- Principe : un job horaire fait le bilan de l'heure écoulée et envoie un
-- check-in `ok` ou `error` à UN moniteur Sentry Crons. Sentry alerte par
-- e-mail sur un check-in `error` ET sur un check-in manquant : pg_cron arrêté,
-- secret absent (la fonction lève avant d'envoyer quoi que ce soit), ou
-- fonction cassée. Le silence est donc lui aussi une alerte.
--
-- Est « en erreur » une heure où :
--   - un job pg_cron a échoué (SQL en erreur, URL construite NULL faute de
--     secret : la panne d'un mois) ;
--   - les appels HTTP des crons ont plus échoué que réussi (EF absente, 401 de
--     la passerelle, 500 en série). Quelques 500 isolés restent du bruit : la
--     plateforme en produit (« JWT issued at future », vu le 2026-09-25) ;
--   - un job qui trace ses runs dans `job_runs` n'a fait QUE des erreurs
--     (quota Highlightly épuisé, par exemple). `notify` n'y écrit pas à chaque
--     tick : il ne compte que quand il écrit.
-- Le check-in ne porte que ce statut : ni compteur ni donnée d'utilisateur ne
-- sort. Le détail se lit en appelant la fonction depuis le SQL editor (elle
-- renvoie son bilan, et envoie un check-in de plus, sans conséquence).
--
-- Le check-in part en POST avec `monitor_config` : Sentry crée ou met à jour
-- le moniteur `cron-health` tout seul (planning, marge). Reste à régler
-- l'alerte e-mail côté Sentry, sur l'environnement `production`.
--
-- ⚠️ Sur CHAQUE projet, prod comprise, créer le secret AVANT `supabase db push`.
--    L'URL se déduit du DSN public de l'app,
--    https://<clé>@o<org>.ingest.de.sentry.io/<projet> :
--      select vault.create_secret(
--        'https://o<org>.ingest.de.sentry.io/api/<projet>/cron/cron-health/<clé>/?environment=production',
--        'sentry_cron_checkin_url');
--    (`environment=development` sur le projet de développement.)
--    Sans lui, chaque tick échoue : c'est voulu, Sentry signale le manque.

create or replace function public.report_cron_health()
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_url text;
  v_since timestamptz := now() - interval '1 hour';
  v_cron_failed int;
  v_http_ok int;
  v_http_failed int;
  v_jobs_down text[];
  v_status text;
begin
  select decrypted_secret into v_url
  from vault.decrypted_secrets
  where name = 'sentry_cron_checkin_url';

  if v_url is null then
    raise exception 'secret Vault sentry_cron_checkin_url absent' using errcode = 'P0002';
  end if;

  select count(*) into v_cron_failed
  from cron.job_run_details d
  join cron.job j using (jobid)
  where d.start_time >= v_since
    and d.status = 'failed'
    and j.jobname <> 'cron-health';

  -- Les réponses de Sentry aux check-ins précédents s'y trouvent aussi : un
  -- par heure, négligeable.
  select count(*) filter (where status_code between 200 and 299 and error_msg is null),
         count(*) filter (where status_code is null or status_code >= 400
                                or error_msg is not null or timed_out)
  into v_http_ok, v_http_failed
  from net._http_response
  where created >= v_since;

  select coalesce(array_agg(job order by job), '{}') into v_jobs_down
  from (
    select job
    from public.job_runs
    where started_at >= v_since
    group by job
    having bool_and(status = 'error')
  ) t;

  v_status := case
    when v_cron_failed > 0 or v_http_failed > v_http_ok or cardinality(v_jobs_down) > 0
      then 'error'
    else 'ok'
  end;

  perform net.http_post(
    url := v_url,
    body := jsonb_build_object(
      'status', v_status,
      'monitor_config', jsonb_build_object(
        'schedule', jsonb_build_object('type', 'crontab', 'value', '30 * * * *'),
        'checkin_margin', 10,
        'max_runtime', 5,
        'timezone', 'UTC'
      )
    ),
    headers := '{"Content-Type": "application/json"}'::jsonb,
    timeout_milliseconds := 10000
  );

  return jsonb_build_object(
    'status', v_status,
    'cron_failed', v_cron_failed,
    'http_ok', v_http_ok,
    'http_failed', v_http_failed,
    'jobs_down', to_jsonb(v_jobs_down)
  );
end;
$$;

-- Outillage : appelée par pg_cron (postgres) et depuis le SQL editor, jamais
-- par l'app. Une fonction naît exécutable par `public`.
revoke execute on function public.report_cron_health() from public, anon, authenticated;

-- cron.schedule est idempotent sur le nom du job.
select cron.schedule(
  'cron-health',
  '30 * * * *',
  $$ select public.report_cron_health(); $$
);
