import type { Database } from '@/lib/database.types';

type Tables = Database['public']['Tables'];

/** Phase d'une compétition : fenêtre de dates [starts_at, ends_at). */
export type CompetitionPhase = Tables['competition_phases']['Row'];

/** Mon joker d'une phase, avec le coup d'envoi du match doublé. */
export type MyPhaseJoker = {
    phaseId: string;
    matchId: string;
    kickoffAt: string;
};

/** Mes jokers d'une compétition, indexés par phase. */
export type JokersByPhase = Map<string, MyPhaseJoker>;

/**
 * État du joker vu depuis une carte de match :
 * - `on` : le joker de la phase est posé sur ce match ;
 * - `available` : aucun joker posé dans la phase ;
 * - `movable` : posé ailleurs, sur un match pas encore commencé (toucher le déplace ici) ;
 * - `spent` : posé ailleurs sur un match commencé — consommé, plus rien à faire ;
 * - `none` : le match n'appartient à aucune phase (pas de joker).
 */
export type JokerCardState = 'on' | 'available' | 'movable' | 'spent' | 'none';
