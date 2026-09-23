import { useTranslation } from 'react-i18next';

import { JokerBadge } from '@/features/jokers/components/joker-badge';
import { TeamFlag } from '@/features/matches/components/team-flag';
import { teamName } from '@/features/matches/format-match';
import { livePeriodKey } from '@/features/matches/live-period';
import type { MatchWithTeams } from '@/features/matches/types';
import type { PredictionRow } from '@/features/predictions/types';
import { Text, View } from '@/tw';

type LiveMatchCardProps = {
    match: MatchWithTeams;
    /** Prono de l'utilisateur sur ce match, s'il en a un (rappel affiché). */
    prediction?: PredictionRow;
    /** Mon joker de la phase est posé sur ce match. */
    jokerOn?: boolean;
};

function TeamSide({ team }: { team: MatchWithTeams['home_team'] }) {
    const { t } = useTranslation(['matches']);
    return (
        <View className="min-w-0 flex-1 items-center gap-2">
            <TeamFlag size="md" team={team} />
            <Text
                className="text-center font-body-bold text-[14px] leading-[17px] text-text"
                numberOfLines={2}>
                {team ? teamName(team, t) : t('matches:teamTbd')}
            </Text>
        </View>
    );
}

/**
 * Carte d'un match en cours de l'accueil (maquette MesMatchs, DS 2026-09-23),
 * sous l'en-tête de section « En cours » : période, score in-play (écrit par
 * l'EF sync-live, léger différé assumé) et rappel de mon prono. Le score
 * final (home_score) reste écrit par sync-results — cette carte ne lit que
 * les colonnes live_*.
 */
export function LiveMatchCard({ match, prediction, jokerOn = false }: LiveMatchCardProps) {
    const { t } = useTranslation(['matches']);
    const periodKey = livePeriodKey(match.live_period);

    return (
        <View className="gap-3.5 rounded-lg border-[1.5px] border-live/40 bg-surface px-4 pb-4 pt-3.5 tc-glow-accent">
            <View className="flex-row items-center justify-between gap-2.5">
                <View className="flex-row items-center gap-1.5">
                    <View className="h-1.5 w-1.5 rounded-pill bg-live" />
                    <Text className="font-body-semibold text-[12px] text-text-muted">
                        {periodKey ? t(periodKey) : t('matches:live.badge')}
                    </Text>
                </View>
                <Text className="text-right font-body text-[11px] text-text-faint">
                    {t('matches:live.delayNote')}
                </Text>
            </View>

            <View className="flex-row items-center gap-2">
                <TeamSide team={match.home_team} />
                <View className="flex-row items-center gap-3">
                    <Text className="font-display text-[48px] leading-[50px] text-text">
                        {match.live_home_score ?? 0}
                    </Text>
                    <Text className="font-display text-[24px] leading-[50px] text-text-faint">
                        -
                    </Text>
                    <Text className="font-display text-[48px] leading-[50px] text-text">
                        {match.live_away_score ?? 0}
                    </Text>
                </View>
                <TeamSide team={match.away_team} />
            </View>

            {prediction ? (
                <View className="flex-row items-center justify-center gap-2">
                    <Text className="font-body text-[14px] text-text-muted">
                        {t('matches:live.yourPrediction', {
                            home: prediction.predicted_home_score,
                            away: prediction.predicted_away_score,
                        })}
                    </Text>
                    {jokerOn ? <JokerBadge /> : null}
                </View>
            ) : null}
        </View>
    );
}
