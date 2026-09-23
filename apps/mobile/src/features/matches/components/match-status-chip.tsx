import { useTranslation } from 'react-i18next';

import { statusLabel } from '@/features/matches/format-match';
import { LiveDot } from '@/features/matches/components/live-dot';
import type { MatchWithTeams } from '@/features/matches/types';
import { Text, View } from '@/tw';

type MatchStatusChipProps = {
    match: Pick<MatchWithTeams, 'status'>;
};

/**
 * Chip de statut, à droite de la barre native du détail de match (maquette
 * Match Detail, DS 2026-09-23) : visible au repos comme replié. « À venir »
 * neutre, « En direct » grenat avec point pulsant, sinon le statut exact
 * (Terminé/Reporté/Annulé). Libellé court : la période live est sous le
 * score du hero, la barre garde la place du score compact centré.
 */
export function MatchStatusChip({ match }: MatchStatusChipProps) {
    const { t } = useTranslation(['matches']);

    if (match.status === 'in_play') {
        return (
            <View className="h-7 flex-row items-center gap-1.5 rounded-pill bg-accent/15 px-3">
                <LiveDot />
                <Text className="font-body-bold text-[11px] uppercase tracking-[0.55px] text-accent">
                    {t('matches:live.badge')}
                </Text>
            </View>
        );
    }

    const statusKey = statusLabel(match.status);
    return (
        <View className="h-7 flex-row items-center rounded-pill bg-surface-sunken px-3">
            <Text className="font-body-bold text-[11px] uppercase tracking-[0.55px] text-text-muted">
                {statusKey ? t(statusKey) : t('matches:detail.upcoming')}
            </Text>
        </View>
    );
}
