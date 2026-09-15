import { useQuery } from '@tanstack/react-query';

import { BAREME_V2 } from '@/features/scoring/bareme';
import type { ScoringRules } from '@/features/scoring/types';
import { supabase } from '@/lib/supabase';

/** Clés numériques attendues d'un barème — garde-fou runtime côté client. */
const RULES_KEYS: (keyof ScoringRules)[] = [
    'version',
    'winnerPointsPerOddsUnit',
    'fallbackOdds',
    'exactScoreBonus',
    'exactGapBonus',
    'closeGapBonus',
    'closeGapTolerance',
    'defensiveBonusPoints',
    'defensiveBonusMaxGap',
    'offensiveBonusRatio',
    'offensiveBonusMinTries',
    'offensiveMalusPoints',
];

/** Valide le jsonb scoring_rules.rules ; barème incomplet ⇒ fallback constant. */
function coerceRules(raw: unknown): ScoringRules {
    if (raw === null || typeof raw !== 'object') {
        return BAREME_V2;
    }
    const record = raw as Record<string, unknown>;
    for (const key of RULES_KEYS) {
        if (typeof record[key] !== 'number' || !Number.isFinite(record[key])) {
            return BAREME_V2;
        }
    }
    return record as unknown as ScoringRules;
}

/**
 * Barème de scoring actif, lu depuis la table `scoring_rules` (source de vérité
 * partagée avec l'Edge Function). `BAREME_V2` sert d'`initialData` (aucun flash
 * « barème absent » ni recalcul d'aperçu erroné au premier rendu ; sûr car le
 * test de parité garantit constante == seed actif) et de repli si la lecture
 * échoue. Le barème change rarement → `staleTime` long.
 */
export function useActiveScoringRules(): ScoringRules {
    const { data } = useQuery({
        queryKey: ['scoring-rules', 'active'],
        staleTime: 1000 * 60 * 60,
        initialData: BAREME_V2,
        queryFn: async (): Promise<ScoringRules> => {
            const { data, error } = await supabase
                .from('scoring_rules')
                .select('rules')
                .eq('is_active', true)
                .maybeSingle();
            if (error) throw error;
            return coerceRules(data?.rules ?? null);
        },
    });
    return data;
}
