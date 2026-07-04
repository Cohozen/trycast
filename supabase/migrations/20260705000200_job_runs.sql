-- Lot 2 : observabilité des jobs serveur + compteur de budget API-Sports (100 req/jour).
-- Listée au Lot 4 dans la feuille de route, créée dès le Lot 2 : sync-fixtures doit
-- tracer ses runs et sa consommation API dès son premier déploiement.

create table public.job_runs (
  id uuid primary key default gen_random_uuid(),
  job text not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running'
    check (status in ('running', 'success', 'error')),
  api_calls_used int not null default 0,
  detail jsonb
);

create index job_runs_job_started_idx on public.job_runs (job, started_at desc);

-- Table technique : invisible des utilisateurs (RLS sans policy), service_role uniquement
alter table public.job_runs enable row level security;
grant all on public.job_runs to service_role;
