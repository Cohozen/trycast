import type { CompetitionPhase, JokerCardState, JokersByPhase } from '@/features/jokers/types';

/**
 * Phase qui contient un coup d'envoi — miroir client de `match_phase_id`
 * (SQL), qui reste la référence : bornes [starts_at, ends_at).
 */
export function findCompetitionPhase(
    phases: readonly CompetitionPhase[],
    kickoffAt: string,
): CompetitionPhase | null {
    const kickoff = Date.parse(kickoffAt);
    return (
        phases.find(
            (phase) =>
                kickoff >= Date.parse(phase.starts_at) && kickoff < Date.parse(phase.ends_at),
        ) ?? null
    );
}

/** État du joker pour la carte d'un match (voir JokerCardState). */
export function jokerCardState(
    matchId: string,
    phase: CompetitionPhase | null,
    jokers: JokersByPhase,
    now: number = Date.now(),
): JokerCardState {
    if (!phase) return 'none';
    const joker = jokers.get(phase.id);
    if (!joker) return 'available';
    if (joker.matchId === matchId) return 'on';
    return Date.parse(joker.kickoffAt) <= now ? 'spent' : 'movable';
}
