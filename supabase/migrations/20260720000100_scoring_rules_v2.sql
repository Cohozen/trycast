-- Barème de scoring v2 (feuille de route revue) :
--   - socle vainqueur porté de 10 à 15 (le 1/N/2 pesait trop peu au rugby)
--   - bonus offensif indexé sur la cote de victoire de l'équipe concernée
--     (25 % × 15 × cote), plus sur celle du vainqueur prédit
--   - nouveau malus offensif (-10) par case cochée mais non atteinte
-- Une seule version active à la fois (index unique partiel) : on désactive la
-- v1 AVANT d'insérer la v2 active, dans la même transaction. Le jsonb est la
-- forme exacte du type TS ScoringRules (camelCase), passé tel quel à
-- computeMatchPoints — il doit rester identique à BAREME_V2 (bareme.ts) et à
-- la copie du test de parité (sync-results/transform.test.ts).

update public.scoring_rules set is_active = false where version = 1;

insert into public.scoring_rules (version, rules, is_active)
values (
    2,
    '{
        "version": 2,
        "winnerPointsPerOddsUnit": 15,
        "fallbackOdds": 2.0,
        "exactScoreBonus": 50,
        "exactGapBonus": 15,
        "closeGapBonus": 8,
        "closeGapTolerance": 5,
        "defensiveBonusPoints": 5,
        "defensiveBonusMaxGap": 7,
        "offensiveBonusRatio": 0.25,
        "offensiveBonusMinTries": 4,
        "offensiveMalusPoints": 10
    }'::jsonb,
    true
);
