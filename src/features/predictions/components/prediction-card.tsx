import type { PostgrestError } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { TeamFlag } from '@/features/matches/components/team-flag';
import { formatKickoff } from '@/features/matches/format-match';
import type { MatchWithTeams } from '@/features/matches/types';
import { BonusToggle } from '@/features/predictions/components/bonus-toggle';
import { CommunityDistribution } from '@/features/predictions/components/community-distribution';
import { ScoreInput } from '@/features/predictions/components/score-input';
import { toPredictionMessageKey } from '@/features/predictions/errors';
import type { PredictionDistribution, PredictionRow } from '@/features/predictions/types';
import { useUpsertPrediction } from '@/features/predictions/use-upsert-prediction';
import { parsePredictedScore, validatePredictedScore } from '@/features/predictions/validation';
import { BAREME_V1 } from '@/features/scoring/bareme';
import { computePotentialPoints } from '@/features/scoring/compute-match-points';
import {
    impliedProbabilities,
    probabilityTone,
    winnerPointsByOutcome,
} from '@/features/scoring/potential-by-outcome';
import { hapticSuccess } from '@/lib/haptics';
import { i18n } from '@/lib/i18n';
import { Text, View } from '@/tw';
import { cn } from '@/tw/variants';

type PredictionCardProps = {
    match: MatchWithTeams;
    prediction: PredictionRow | undefined;
    userId: string;
    /** Distribution communautaire du match (remplace les barres de cotes dès qu'un prono existe). */
    distribution?: PredictionDistribution;
};

type SaveStatus = 'toPredict' | 'saving' | 'saved';

const STATUS_CLASSES: Record<SaveStatus, { pill: string; text: string; dot: string }> = {
    toPredict: { pill: 'bg-accent/15', text: 'text-accent', dot: 'bg-accent' },
    saving: { pill: 'bg-text/10', text: 'text-text-muted', dot: 'bg-text-muted' },
    saved: { pill: 'bg-success/15', text: 'text-success', dot: 'bg-success' },
};

const TONE_CLASSES = {
    success: 'bg-success',
    warning: 'bg-warning',
    danger: 'bg-danger',
} as const;

/**
 * Carte de prono d'un match à venir (maquette MesMatchs) : saisie du score
 * exact + bonus offensif, **auto-enregistrée** (debounce, statut dans la
 * carte, aucun bouton). La deadline reste portée par la RLS : après kickoff
 * le serveur refuse (42501) et l'erreur s'affiche.
 */
export function PredictionCard({ match, prediction, userId, distribution }: PredictionCardProps) {
    const { t } = useTranslation(['predictions', 'matches']);
    const [homeRaw, setHomeRaw] = useState(
        prediction ? String(prediction.predicted_home_score) : '',
    );
    const [awayRaw, setAwayRaw] = useState(
        prediction ? String(prediction.predicted_away_score) : '',
    );
    const [bonusHome, setBonusHome] = useState(prediction?.predicted_bonus_off_home ?? false);
    const [bonusAway, setBonusAway] = useState(prediction?.predicted_bonus_off_away ?? false);

    const upsert = useUpsertPrediction(userId, match.competition_id);

    const homeInvalid = homeRaw !== '' && validatePredictedScore(homeRaw) !== null;
    const awayInvalid = awayRaw !== '' && validatePredictedScore(awayRaw) !== null;
    const complete =
        homeRaw !== '' &&
        awayRaw !== '' &&
        validatePredictedScore(homeRaw) === null &&
        validatePredictedScore(awayRaw) === null;

    const draft = complete
        ? {
            match_id: match.id,
            predicted_home_score: parsePredictedScore(homeRaw),
            predicted_away_score: parsePredictedScore(awayRaw),
            predicted_bonus_off_home: bonusHome,
            predicted_bonus_off_away: bonusAway,
        }
        : null;

    const saved =
        prediction !== undefined &&
        draft !== null &&
        draft.predicted_home_score === prediction.predicted_home_score &&
        draft.predicted_away_score === prediction.predicted_away_score &&
        draft.predicted_bonus_off_home === prediction.predicted_bonus_off_home &&
        draft.predicted_bonus_off_away === prediction.predicted_bonus_off_away;

    // Auto-save : toute saisie complète différente du prono serveur part
    // après un court debounce (sauvegarde optimiste, aucun bouton)
    const { mutate } = upsert;
    useEffect(() => {
        if (draft === null || saved) return;
        const timer = setTimeout(() => mutate(draft, { onSuccess: hapticSuccess }), 700);
        return () => clearTimeout(timer);
        // draft est dérivé de ces quatre états — les lister évite un objet neuf par rendu
    }, [homeRaw, awayRaw, bonusHome, bonusAway, saved, mutate]); // eslint-disable-line react-hooks/exhaustive-deps

    const odds = { home: match.odds_home, draw: match.odds_draw, away: match.odds_away };
    const potential = draft
        ? computePotentialPoints(
            {
                homeScore: draft.predicted_home_score,
                awayScore: draft.predicted_away_score,
                bonusOffHome: draft.predicted_bonus_off_home,
                bonusOffAway: draft.predicted_bonus_off_away,
            },
            odds,
            BAREME_V1,
        )
        : null;
    const winnerPoints = winnerPointsByOutcome(odds, BAREME_V1);
    const probabilities = impliedProbabilities(odds);

    const predictedOutcome = potential?.breakdown.predictedOutcome ?? null;
    const bonusValue = potential
        ? Math.round(BAREME_V1.offensiveBonusRatio * potential.breakdown.winnerPoints)
        : null;

    const status: SaveStatus = upsert.isPending ? 'saving' : saved ? 'saved' : 'toPredict';
    const statusClasses = STATUS_CLASSES[status];
    const statusLabels: Record<SaveStatus, string> = {
        toPredict: t('predictions:status.toPredict'),
        saving: t('predictions:status.saving'),
        saved: t('predictions:status.saved'),
    };

    const cells: { key: '1' | 'N' | '2'; outcome: 'home' | 'draw' | 'away' }[] = [
        { key: '1', outcome: 'home' },
        { key: 'N', outcome: 'draw' },
        { key: '2', outcome: 'away' },
    ];

    return (
        <View className="gap-3.5 rounded-lg border border-border bg-surface p-4 tc-shadow-md">
            {/* Coup d'envoi + statut */}
            <View className="flex-row items-center justify-between gap-2">
                <Text className="font-body-semibold text-[11px] uppercase tracking-[0.77px] text-text-faint">
                    {formatKickoff(match.kickoff_at, { locale: i18n.language })}
                </Text>
                <View
                    className={cn(
                        'flex-row items-center gap-1.5 rounded-pill px-2.5 py-1',
                        statusClasses.pill,
                    )}>
                    <View className={cn('h-1.5 w-1.5 rounded-pill', statusClasses.dot)} />
                    <Text
                        className={cn(
                            'font-body-bold text-[10.5px] uppercase tracking-[0.4px]',
                            statusClasses.text,
                        )}>
                        {statusLabels[status]}
                    </Text>
                </View>
            </View>

            {/* Noms + drapeaux + saisie du score */}
            <View className="flex-row items-center justify-between">
                <Text className="flex-1 text-center font-body-bold text-[18px] text-text">
                    {match.home_team?.name ?? t('matches:teamTbd')}
                </Text>
                <View className="w-6" />
                <Text className="flex-1 text-center font-body-bold text-[18px] text-text">
                    {match.away_team?.name ?? t('matches:teamTbd')}
                </Text>
            </View>
            <View className="flex-row items-center justify-between gap-2.5">
                <View className="flex flex-row items-center gap-2.5">
                    <View className="px-2">
                        <TeamFlag size="lg" team={match.home_team} />
                    </View>
                    <ScoreInput
                        accessibilityLabel={t('predictions:form.homeScore')}
                        invalid={homeInvalid}
                        onChangeText={setHomeRaw}
                        value={homeRaw}
                    />
                </View>
                <Text className="font-display text-[24px] text-text-faint">–</Text>
                <View className="flex flex-row items-center gap-2.5">
                    <ScoreInput
                        accessibilityLabel={t('predictions:form.awayScore')}
                        invalid={awayInvalid}
                        onChangeText={setAwayRaw}
                        value={awayRaw}
                    />
                    <View className="px-2">
                        <TeamFlag size="lg" team={match.away_team} />
                    </View>
                </View>
            </View>

            {/* Bonus offensif */}
            <View className="flex-row items-center justify-center gap-3">
                <Text
                    className="w-12 text-center font-display text-[16px] text-accent"
                    numberOfLines={1}>
                    {bonusValue !== null ? `+${bonusValue}` : '+25%'}
                </Text>
                <BonusToggle
                    accessibilityLabel={t('predictions:form.bonusHome')}
                    checked={bonusHome}
                    onToggle={() => setBonusHome((v) => !v)}
                />
                <Text className="text-center font-body-semibold text-[11px] uppercase tracking-[0.66px] text-text-faint">
                    {t('predictions:form.bonusLabel')}
                </Text>
                <BonusToggle
                    accessibilityLabel={t('predictions:form.bonusAway')}
                    checked={bonusAway}
                    onToggle={() => setBonusAway((v) => !v)}
                />
                <Text
                    className="w-12 text-center font-display text-[16px] text-accent"
                    numberOfLines={1}>
                    {bonusValue !== null ? `+${bonusValue}` : '+25%'}
                </Text>
            </View>

            {/* Points potentiels · 1 N 2 */}
            <View className="gap-2">
                <Text className="text-center font-body-semibold text-[11px] uppercase tracking-[0.66px] text-text-faint">
                    {t('predictions:form.potentialLabel')}
                </Text>
                <View className="flex-row gap-2">
                    {cells.map(({ key, outcome }) => {
                        const active = predictedOutcome === outcome;
                        return (
                            <View
                                className={cn(
                                    'flex-1 items-center gap-0.5 rounded-sm border-[1.5px] border-transparent bg-surface-sunken px-1 py-2',
                                    active && 'border-accent bg-accent/10',
                                )}
                                key={key}>
                                <Text
                                    className={cn(
                                        'font-body-bold text-[11px]',
                                        active ? 'text-accent' : 'text-text-faint',
                                    )}>
                                    {key}
                                </Text>
                                <Text className="font-display text-[20px] leading-5.25 text-text">
                                    {active && potential ? potential.total : winnerPoints[outcome]}
                                </Text>
                            </View>
                        );
                    })}
                </View>
                {/* La communauté a joué (décision 2026-07-11 : visible aussi avant
                    kickoff) ; tant que personne n'a pronostiqué, repli sur les
                    probabilités implicites des cotes — autre sémantique, d'où la
                    légende portée par CommunityDistribution. */}
                {distribution && distribution.total > 0 ? (
                    <CommunityDistribution distribution={distribution} />
                ) : probabilities ? (
                    <View className="flex-row gap-2">
                        {cells.map(({ key, outcome }) => (
                            <View className="flex-1 px-1" key={key}>
                                <View className="h-1 overflow-hidden rounded-pill bg-text/10">
                                    <View
                                        className={cn(
                                            'h-full rounded-pill',
                                            TONE_CLASSES[probabilityTone(probabilities[outcome])],
                                        )}
                                        style={{
                                            width: `${Math.round(probabilities[outcome] * 100)}%`,
                                        }}
                                    />
                                </View>
                            </View>
                        ))}
                    </View>
                ) : null}
            </View>

            {upsert.isError ? (
                <Text className="font-body text-[13px] text-accent">
                    {t(toPredictionMessageKey(upsert.error as PostgrestError))}
                </Text>
            ) : null}
        </View>
    );
}
