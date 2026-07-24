import { useTranslation } from 'react-i18next';

import { MatchStatusChip } from '@/features/matches/components/match-status-chip';
import { TeamFlag } from '@/features/matches/components/team-flag';
import { formatKickoffTime, teamName } from '@/features/matches/format-match';
import type { MatchDetail, TeamRow } from '@/features/matches/types';
import { winnerPointsByOutcome } from '@/features/scoring/potential-by-outcome';
import type { MatchOutcome } from '@/features/scoring/types';
import { useActiveScoringRules } from '@/features/scoring/use-active-scoring-rules';
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
 * compétition + journée et points potentiels 1/N/2. Ne lit que des colonnes déjà en
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

    // Points « vainqueur » de chaque issue 1/N/2 avant toute saisie, comme la
    // card « Mes pronos » (winnerPointsByOutcome + repli de cote identique au
    // scoring réel). Remplace l'affichage des cotes brutes ; masqué sans cotes
    // (cas quasi impossible d'atterrir ici sans elles, mais aucun repli menteur).
    const hasOdds =
        match.odds_home !== null && match.odds_draw !== null && match.odds_away !== null;
    const rules = useActiveScoringRules();
    const winnerPoints = winnerPointsByOutcome(
        { home: match.odds_home, draw: match.odds_draw, away: match.odds_away },
        rules,
    );
    // Issue effectivement gagnée d'un match terminé : sa pastille est surlignée.
    const winningOutcome: MatchOutcome | null = finalScore
        ? (home as number) > (away as number)
            ? 'home'
            : (away as number) > (home as number)
              ? 'away'
              : 'draw'
        : null;
    const pointsPills: { key: string; label: string; value: number; outcome: MatchOutcome }[] = [
        { key: '1', label: match.home_team?.code ?? '1', value: winnerPoints.home, outcome: 'home' },
        { key: 'N', label: 'N', value: winnerPoints.draw, outcome: 'draw' },
        { key: '2', label: match.away_team?.code ?? '2', value: winnerPoints.away, outcome: 'away' },
    ];

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
                        {pointsPills.map((pill) => {
                            const won = winningOutcome === pill.outcome;
                            return (
                                <View
                                    className={cn(
                                        'flex-row items-baseline gap-1 rounded-pill border border-transparent bg-surface-sunken px-2 py-0.5',
                                        won && 'border-accent bg-accent/10',
                                    )}
                                    key={pill.key}>
                                    <Text
                                        className={cn(
                                            'font-body-bold text-[11px]',
                                            won ? 'text-accent' : 'text-text-muted',
                                        )}>
                                        {pill.label}
                                    </Text>
                                    <Text
                                        className={cn(
                                            'font-body-bold text-[11px]',
                                            won ? 'text-accent' : 'text-text',
                                        )}>
                                        {t('matches:detail.potentialPoints', { count: pill.value })}
                                    </Text>
                                </View>
                            );
                        })}
                    </View>
                ) : null}
            </View>
        </View>
    );
}
