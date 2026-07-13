import { useTranslation } from 'react-i18next';

import { Avatar } from '@/components/ui/avatar';
import type { MatchWithTeams } from '@/features/matches/types';
import type { MemberPrediction } from '@/features/predictions/types';
import { Text, View } from '@/tw';
import { cn } from '@/tw/variants';

type MemberPredictionRowProps = {
    entry: MemberPrediction;
    /** Met en évidence la ligne de l'utilisateur connecté. */
    isMe: boolean;
    match: MatchWithTeams;
};

/**
 * Ligne d'un membre de la ligue sur la page de détail (vue Pronos, après
 * kickoff uniquement) : avatar, pseudo, pill du prono (« — » pour un membre
 * sans prono, décision 2026-07-13) et points gagnés une fois le match scoré.
 * Le marqueur « Score exact » est dérivé côté client : la RPC n'expose pas
 * le breakdown des autres.
 */
export function MemberPredictionRow({ entry, isMe, match }: MemberPredictionRowProps) {
    const { t } = useTranslation(['predictions']);

    const hasPrediction =
        entry.predicted_home_score !== null && entry.predicted_away_score !== null;
    const exact =
        hasPrediction &&
        match.status === 'finished' &&
        match.home_score !== null &&
        match.away_score !== null &&
        entry.predicted_home_score === match.home_score &&
        entry.predicted_away_score === match.away_score;
    const scored = entry.points_awarded !== null;

    return (
        <View
            className={cn(
                'flex-row items-center gap-3 rounded-md border bg-surface px-3.5 py-2.5',
                isMe ? 'border-accent/40 bg-accent/10' : 'border-border',
            )}>
            <Avatar name={entry.username} ring={isMe} size="sm" uri={entry.avatar_url} />
            <View className="min-w-0 flex-1 gap-1">
                <Text
                    className={cn(
                        'text-[14px]',
                        isMe ? 'font-body-bold text-text' : 'font-body-semibold text-text',
                    )}
                    numberOfLines={1}>
                    {entry.username}
                </Text>
                {exact ? (
                    <View className="self-start rounded-pill bg-accent/15 px-2 py-px">
                        <Text className="font-body-bold text-[10px] text-accent">
                            {t('predictions:verdict.exact')}
                        </Text>
                    </View>
                ) : null}
            </View>
            <View className="rounded-pill bg-surface-sunken px-2.5 py-0.5">
                <Text className="font-body-bold text-[13px] text-text-muted">
                    {hasPrediction
                        ? `${entry.predicted_home_score} – ${entry.predicted_away_score}`
                        : '—'}
                </Text>
            </View>
            {scored ? (
                <View className="min-w-[46px] flex-row items-baseline justify-end gap-0.5">
                    <Text
                        className={cn(
                            'font-display text-[20px] leading-[21px]',
                            (entry.points_awarded ?? 0) > 0 ? 'text-accent' : 'text-text-faint',
                        )}>
                        +{entry.points_awarded}
                    </Text>
                    <Text
                        className={cn(
                            'font-body-bold text-[10px]',
                            (entry.points_awarded ?? 0) > 0 ? 'text-accent' : 'text-text-faint',
                        )}>
                        pts
                    </Text>
                </View>
            ) : null}
        </View>
    );
}
