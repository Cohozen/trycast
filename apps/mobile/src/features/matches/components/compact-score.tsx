import { TeamFlag } from '@/features/matches/components/team-flag';
import { formatKickoffTime } from '@/features/matches/format-match';
import type { MatchDetail } from '@/features/matches/types';
import { i18n } from '@/lib/i18n';
import { Text } from '@/tw';

/**
 * Résumé du hero pour la barre native repliée (DS 2026-09-21) : drapeaux et
 * score — live, final, ou heure du coup d'envoi avant le match.
 */
export function CompactScore({ match }: { match: MatchDetail }) {
    const isLive = match.status === 'in_play';
    const isFinal =
        match.status === 'finished' && match.home_score !== null && match.away_score !== null;
    const center = isLive
        ? `${match.live_home_score ?? 0}–${match.live_away_score ?? 0}`
        : isFinal
          ? `${match.home_score}–${match.away_score}`
          : formatKickoffTime(match.kickoff_at, { locale: i18n.language });

    return (
        <>
            <TeamFlag size="sm" team={match.home_team} />
            <Text className="font-display text-[19px] leading-[20px] text-text">{center}</Text>
            <TeamFlag size="sm" team={match.away_team} />
        </>
    );
}
