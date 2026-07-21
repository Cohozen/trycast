import { useTranslation } from 'react-i18next';

import { MatchStatusChip } from '@/features/matches/components/match-status-chip';
import { TeamFlag } from '@/features/matches/components/team-flag';
import { formatKickoffTime, teamName } from '@/features/matches/format-match';
import type { MatchDetail, TeamRow } from '@/features/matches/types';
import { i18n } from '@/lib/i18n';
import { Text, View } from '@/tw';
import { cn } from '@/tw/variants';

type MatchHeroProps = {
    match: MatchDetail;
};

/** Date du coup d'envoi sans l'heure, ex. « sam. 8 août ». */
function formatKickoffDate(iso: string, locale: string): string {
    return new Intl.DateTimeFormat(locale, {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
    }).format(new Date(iso));
}

function TeamColumn({
    team,
    muted,
    tries,
}: {
    team: TeamRow | null;
    muted: boolean;
    /** Essais de l'équipe, affichés seulement s'ils sont renseignés. */
    tries: number | null;
}) {
    const { t } = useTranslation(['matches']);
    return (
        <View className="min-w-0 flex-1 items-center gap-2">
            <TeamFlag size="lg" team={team} />
            <View className="items-center gap-0.5">
                <Text
                    className={cn(
                        'text-center font-body-bold text-[14px] leading-[16px]',
                        muted ? 'text-text-muted' : 'text-text',
                    )}
                    numberOfLines={2}>
                    {team ? teamName(team, t) : t('matches:teamTbd')}
                </Text>
                {tries !== null ? (
                    <Text className="text-center font-body text-[11px] text-text-muted">
                        {t('matches:detail.tries', { count: tries })}
                    </Text>
                ) : null}
            </View>
        </View>
    );
}

/**
 * Hero de la page de détail (maquette Match Detail, sans la timeline) :
 * équipes, gros score (live ou final) ou coup d'envoi, chip statut, ligne
 * compétition + journée et cotes discrètes. Ne lit que des colonnes déjà en
 * base — le score live vient des colonnes live_* écrites par l'EF sync-live.
 */
export function MatchHero({ match }: MatchHeroProps) {
    const { t } = useTranslation(['matches']);

    const isLive = match.status === 'in_play';
    const finalScore =
        match.status === 'finished' && match.home_score !== null && match.away_score !== null;
    const showScore = isLive || finalScore;
    const home = isLive ? (match.live_home_score ?? 0) : match.home_score;
    const away = isLive ? (match.live_away_score ?? 0) : match.away_score;
    const homeWins = finalScore ? (home as number) > (away as number) : null;

    const hasOdds =
        match.odds_home !== null && match.odds_draw !== null && match.odds_away !== null;
    const formatOdd = (value: number) =>
        new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 2 }).format(value);
    const oddsPills = hasOdds
        ? [
              { key: '1', label: match.home_team?.code ?? '1', value: match.odds_home as number },
              { key: 'N', label: 'N', value: match.odds_draw as number },
              { key: '2', label: match.away_team?.code ?? '2', value: match.odds_away as number },
          ]
        : [];

    const competitionLine = [
        match.competition?.name,
        match.round ? t('matches:results.number_day', { count: match.round }) : null,
    ]
        .filter(Boolean)
        .join(' · ');

    // bg-bg : le hero est épinglé (sticky) sur la page de détail, fond opaque
    // obligatoire pour masquer le contenu défilant dessous.
    return (
        <View className="gap-3 border-b border-border bg-bg pb-4">
            <MatchStatusChip match={match} />

            <View className="flex-row items-start gap-1.5">
                <TeamColumn
                    muted={homeWins === false}
                    team={match.home_team}
                    tries={match.home_tries}
                />
                <View className="items-center px-1 pt-2">
                    {showScore ? (
                        <View className="flex-row items-baseline gap-2">
                            <Text className="font-display text-[46px] leading-[47px] text-text">
                                {home ?? '–'}
                            </Text>
                            <Text className="font-display text-[28px] leading-[47px] text-text-faint">
                                –
                            </Text>
                            <Text className="font-display text-[46px] leading-[47px] text-text">
                                {away ?? '–'}
                            </Text>
                        </View>
                    ) : (
                        <View className="items-center gap-0.5">
                            <Text className="font-body-bold text-[10px] uppercase tracking-[0.6px] text-text-faint">
                                {t('matches:detail.kickoff')}
                            </Text>
                            <Text className="font-display text-[40px] leading-[41px] text-text">
                                {formatKickoffTime(match.kickoff_at, { locale: i18n.language })}
                            </Text>
                            <Text className="font-body text-[12px] text-text-muted">
                                {formatKickoffDate(match.kickoff_at, i18n.language)}
                            </Text>
                        </View>
                    )}
                </View>
                <TeamColumn
                    muted={homeWins === true}
                    team={match.away_team}
                    tries={match.away_tries}
                />
            </View>

            <View className="items-center gap-2">
                {competitionLine ? (
                    <Text className="text-center font-body text-[12px] text-text-muted">
                        {competitionLine}
                    </Text>
                ) : null}
                {hasOdds ? (
                    <View className="flex-row items-center gap-2">
                        {oddsPills.map((pill) => (
                            <View
                                className="flex-row items-baseline gap-1 rounded-pill bg-surface-sunken px-2 py-0.5"
                                key={pill.key}>
                                <Text className="font-body-bold text-[11px] text-text">
                                    {pill.label}
                                </Text>
                                <Text className="font-body text-[11px] text-text-muted">
                                    {formatOdd(pill.value)}
                                </Text>
                            </View>
                        ))}
                    </View>
                ) : null}
            </View>
        </View>
    );
}
