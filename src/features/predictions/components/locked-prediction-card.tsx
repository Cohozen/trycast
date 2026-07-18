import { Lock } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import { TeamFlag } from '@/features/matches/components/team-flag';
import { teamName } from '@/features/matches/format-match';
import type { MatchWithTeams } from '@/features/matches/types';
import type { PredictionRow } from '@/features/predictions/types';
import { BAREME_V1 } from '@/features/scoring/bareme';
import { computePotentialPoints } from '@/features/scoring/compute-match-points';
import { Text, useThemeColor, View } from '@/tw';

type LockedPredictionCardProps = {
    match: MatchWithTeams;
    prediction: PredictionRow | undefined;
};

/**
 * Carte « Prono verrouillé » de la page de détail (maquette Match Detail,
 * états live/verrouillé) : score courant en lecture seule, rappel du prono
 * et points potentiels. PredictionCard n'est pas réutilisable ici — tout son
 * corps est construit autour de la saisie (états locaux, debounce, inputs).
 * Pas de projection contre le score live (décision live-match-card) : le
 * badge affiche les points potentiels pondérés par la cote.
 */
export function LockedPredictionCard({ match, prediction }: LockedPredictionCardProps) {
    const { t } = useTranslation(['predictions', 'matches']);
    const textFaint = useThemeColor('text-faint');

    const isLive = match.status === 'in_play';
    const homeScore = isLive ? (match.live_home_score ?? 0) : (match.home_score ?? '–');
    const awayScore = isLive ? (match.live_away_score ?? 0) : (match.away_score ?? '–');

    const potential = prediction
        ? computePotentialPoints(
              {
                  homeScore: prediction.predicted_home_score,
                  awayScore: prediction.predicted_away_score,
                  bonusOffHome: prediction.predicted_bonus_off_home,
                  bonusOffAway: prediction.predicted_bonus_off_away,
              },
              { home: match.odds_home, draw: match.odds_draw, away: match.odds_away },
              BAREME_V1,
          )
        : null;

    const bonusTags: string[] = [];
    if (prediction?.predicted_bonus_off_home) {
        bonusTags.push(match.home_team?.code ?? match.home_team?.name ?? '?');
    }
    if (prediction?.predicted_bonus_off_away) {
        bonusTags.push(match.away_team?.code ?? match.away_team?.name ?? '?');
    }

    const teamRow = (side: 'home' | 'away') => {
        const team = side === 'home' ? match.home_team : match.away_team;
        const score = side === 'home' ? homeScore : awayScore;
        return (
            <View className="flex-row items-center gap-3">
                <TeamFlag team={team} />
                <Text className="flex-1 font-body-semibold text-[16px] text-text">
                    {team ? teamName(team, t) : t('matches:teamTbd')}
                </Text>
                <Text className="font-display text-[26px] leading-[27px] text-text">{score}</Text>
            </View>
        );
    };

    return (
        <View className="rounded-md border border-border bg-surface p-4 tc-shadow-sm">
            <View className="mb-3.5 flex-row items-center gap-1.5">
                <Lock color={textFaint} size={12} strokeWidth={2} />
                <Text className="font-body-bold text-[11px] uppercase tracking-[0.66px] text-text-faint">
                    {t('predictions:locked.header')}
                </Text>
            </View>

            <View className="gap-3">
                {teamRow('home')}
                {teamRow('away')}
            </View>

            <View className="mt-3.5 gap-2.5 border-t border-dashed border-border pt-3">
                {prediction ? (
                    <>
                        <View className="flex-row flex-wrap items-center gap-2">
                            <Text className="font-body-semibold text-[11px] uppercase tracking-[0.44px] text-text-faint">
                                {t('predictions:reconciliation.yourProno')}
                            </Text>
                            <View className="rounded-pill bg-accent/15 px-2.5 py-0.5">
                                <Text className="font-body-bold text-[13px] text-accent">
                                    {prediction.predicted_home_score} –{' '}
                                    {prediction.predicted_away_score}
                                </Text>
                            </View>
                            {bonusTags.map((code) => (
                                <View
                                    className="flex-row items-center gap-1 rounded-pill border border-accent/40 px-2 py-0.5"
                                    key={code}>
                                    <View className="h-1 w-1 rounded-pill bg-accent" />
                                    <Text className="font-body-semibold text-[10.5px] text-accent">
                                        {t('predictions:reconciliation.bonusTag', { code })}
                                    </Text>
                                </View>
                            ))}
                        </View>
                        <View className="flex-row items-center justify-between gap-2.5">
                            <Text className="font-body-semibold text-[11px] uppercase tracking-[0.44px] text-text-faint">
                                {t('predictions:form.potentialLabel')}
                            </Text>
                            <View className="flex-row items-baseline gap-1 rounded-pill bg-accent px-3 py-1 tc-shadow-sm">
                                <Text className="font-display text-[20px] leading-[21px] text-on-accent">
                                    {potential?.total ?? '–'}
                                </Text>
                                <Text className="font-body-bold text-[11px] text-on-accent">
                                    pts
                                </Text>
                            </View>
                        </View>
                    </>
                ) : (
                    <Text className="font-body text-[13px] text-text-muted">
                        {t('predictions:reconciliation.notPredicted')}
                    </Text>
                )}
            </View>
        </View>
    );
}
