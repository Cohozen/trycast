import { useTranslation } from 'react-i18next';

import { TeamFlag } from '@/features/matches/components/team-flag';
import { livePeriodKey } from '@/features/matches/live-period';
import type { MatchWithTeams } from '@/features/matches/types';
import type { PredictionRow } from '@/features/predictions/types';
import { Text, View } from '@/tw';

type LiveMatchCardProps = {
    match: MatchWithTeams;
    /** Prono de l'utilisateur sur ce match, s'il en a un (rappel affiché). */
    prediction?: PredictionRow;
};

function TeamSide({
    team,
    alignEnd = false,
}: {
    team: MatchWithTeams['home_team'];
    alignEnd?: boolean;
}) {
    return (
        <View className={`flex-1 items-center gap-1.5 ${alignEnd ? 'flex-col-reverse' : ''}`}>
            <TeamFlag size="md" team={team} />
            <Text className="font-body-bold text-[13px] text-text" numberOfLines={1}>
                {team?.code ?? team?.name ?? '?'}
            </Text>
        </View>
    );
}

/**
 * Carte « EN DIRECT » épinglée en tête de l'accueil Matchs : score in-play
 * (écrit par l'EF sync-live), période et léger différé assumé. Le score final
 * (home_score) reste écrit par sync-results — cette carte ne lit que les
 * colonnes live_*. La projection de points chiffrés viendra à l'activation,
 * une fois vérifiable avec de vraies données.
 */
export function LiveMatchCard({ match, prediction }: LiveMatchCardProps) {
    const { t } = useTranslation(['matches']);
    const periodKey = livePeriodKey(match.live_period);
    const home = match.live_home_score ?? 0;
    const away = match.live_away_score ?? 0;

    return (
        <View className="gap-3 rounded-lg border border-accent/40 bg-accent/5 px-4 py-3.5 tc-shadow-sm">
            <View className="flex-row items-center justify-between gap-2">
                <View className="flex-row items-center gap-1.5">
                    <View className="h-2 w-2 rounded-pill bg-accent" />
                    <Text className="font-body-bold text-[11px] uppercase tracking-[0.7px] text-accent">
                        {t('matches:live.badge')}
                    </Text>
                    {periodKey ? (
                        <Text className="font-body-semibold text-[11px] text-text-muted">
                            · {t(periodKey)}
                        </Text>
                    ) : null}
                </View>
                <Text className="font-body text-[10.5px] text-text-faint">
                    {t('matches:live.delayNote')}
                </Text>
            </View>

            <View className="flex-row items-center gap-2">
                <TeamSide team={match.home_team} />
                <View className="flex-row items-baseline gap-2">
                    <Text className="font-display text-[34px] leading-[34px] text-text">
                        {home}
                    </Text>
                    <Text className="font-display text-[22px] leading-[34px] text-text-faint">
                        –
                    </Text>
                    <Text className="font-display text-[34px] leading-[34px] text-text">
                        {away}
                    </Text>
                </View>
                <TeamSide alignEnd team={match.away_team} />
            </View>

            {prediction ? (
                <Text className="text-center font-body text-[12px] text-text-muted">
                    {t('matches:live.yourPrediction', {
                        home: prediction.predicted_home_score,
                        away: prediction.predicted_away_score,
                    })}
                </Text>
            ) : null}
        </View>
    );
}
