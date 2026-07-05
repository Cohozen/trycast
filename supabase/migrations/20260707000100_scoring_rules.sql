-- Lot 4 : barème de scoring versionné en DB (décision actée : barème fixe
-- global, une version active à la fois). `rules` est la forme jsonb exacte du
-- type TS ScoringRules (camelCase) : l'Edge Function de scoring le passe tel
-- quel à computeMatchPoints, zéro mapping. Le seed v1 reprend BAREME_V1
-- (supabase/functions/_shared/scoring/bareme.ts) — l'app garde la constante
-- hardcodée pour l'aperçu tant qu'il n'existe qu'une v1.

create table public.scoring_rules (
    version int primary key,
    rules jsonb not null,
    is_active boolean not null default false,
    created_at timestamptz not null default now(),
    -- le jsonb embarque sa propre version (lue par computeMatchPoints) :
    -- elle doit coïncider avec la clé
    constraint scoring_rules_version_coherente check ((rules ->> 'version')::int = version)
);

-- Au plus une version active à la fois
create unique index scoring_rules_une_seule_active on public.scoring_rules ((is_active))
where
    is_active;

alter table public.scoring_rules enable row level security;

-- Lecture pour les clients authentifiés (l'app affichera le barème actif quand
-- une v2 existera) ; aucune policy d'écriture : le barème n'évolue que par
-- migration (service_role / postgres passent outre la RLS).
create policy "scoring_rules_select_authenticated" on public.scoring_rules
    for select to authenticated
    using (true);

-- Default privileges legacy du projet dev : revoke + regrant explicites
revoke all on public.scoring_rules from anon, authenticated;
grant select on public.scoring_rules to authenticated;
grant all on public.scoring_rules to service_role;

insert into public.scoring_rules (version, rules, is_active)
values (
    1,
    '{
        "version": 1,
        "winnerPointsPerOddsUnit": 10,
        "fallbackOdds": 2.0,
        "exactScoreBonus": 50,
        "exactGapBonus": 15,
        "closeGapBonus": 8,
        "closeGapTolerance": 5,
        "defensiveBonusPoints": 5,
        "defensiveBonusMaxGap": 7,
        "offensiveBonusRatio": 0.25,
        "offensiveBonusMinTries": 4
    }'::jsonb,
    true
);
