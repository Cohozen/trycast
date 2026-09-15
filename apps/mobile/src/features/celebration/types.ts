import type { TeamRow } from '@/features/matches/types';
import type { Verdict } from '@/features/predictions/verdict';

/**
 * Ligne du récap de célébration : un prono gagné depuis la dernière visite.
 * Les équipes sont embarquées brutes (nom résolu côté overlay via teamName).
 */
export type CelebrationItem = {
    matchId: string;
    homeTeam: TeamRow | null;
    awayTeam: TeamRow | null;
    points: number;
    verdict: Verdict;
};
