import { describe, expect, it } from 'vitest';
import type { MatchWithTeams } from '@/features/matches/types';
import { splitMatches } from './split-matches';

const NOW = new Date('2026-07-10T12:00:00Z');

function match(id: string, kickoffAt: string, status: MatchWithTeams['status']): MatchWithTeams {
    return {
        id,
        competition_id: 'comp-1',
        api_game_id: 1,
        home_team_id: null,
        away_team_id: null,
        home_team: null,
        away_team: null,
        kickoff_at: kickoffAt,
        round: null,
        status,
        odds_home: null,
        odds_draw: null,
        odds_away: null,
        odds_source: null,
        odds_captured_at: null,
        home_score: null,
        away_score: null,
        home_tries: null,
        away_tries: null,
        tries_missing: false,
        needs_review: false,
        scored_at: null,
    };
}

describe('splitMatches', () => {
    it('sépare à venir (kickoff futur, scheduled) et résultats (passés ou en cours)', () => {
        const { upcoming, results } = splitMatches(
            [
                match('fini', '2026-07-04T14:00:00Z', 'finished'),
                match('futur', '2026-07-12T14:00:00Z', 'scheduled'),
                match('en-cours', '2026-07-10T11:00:00Z', 'in_play'),
            ],
            NOW,
        );
        expect(upcoming.map((m) => m.id)).toEqual(['futur']);
        expect(results.map((m) => m.id)).toEqual(['en-cours', 'fini']);
    });

    it('à venir : le plus proche en premier ; résultats : le plus récent en premier', () => {
        const { upcoming, results } = splitMatches(
            [
                match('dans-un-mois', '2026-08-10T14:00:00Z', 'scheduled'),
                match('demain', '2026-07-11T14:00:00Z', 'scheduled'),
                match('hier', '2026-07-09T14:00:00Z', 'finished'),
                match('semaine-derniere', '2026-07-03T14:00:00Z', 'finished'),
            ],
            NOW,
        );
        expect(upcoming.map((m) => m.id)).toEqual(['demain', 'dans-un-mois']);
        expect(results.map((m) => m.id)).toEqual(['hier', 'semaine-derniere']);
    });

    it('kickoff passé mais status encore scheduled : bascule côté résultats (deadline)', () => {
        const { upcoming, results } = splitMatches(
            [match('retard-api', '2026-07-10T11:55:00Z', 'scheduled')],
            NOW,
        );
        expect(upcoming).toEqual([]);
        expect(results.map((m) => m.id)).toEqual(['retard-api']);
    });

    it('reportés et annulés vont côté résultats (leur statut y est affiché)', () => {
        const { upcoming, results } = splitMatches(
            [
                match('reporte', '2026-07-20T14:00:00Z', 'postponed'),
                match('annule', '2026-07-25T14:00:00Z', 'cancelled'),
            ],
            NOW,
        );
        expect(upcoming).toEqual([]);
        expect(results.map((m) => m.id)).toEqual(['annule', 'reporte']);
    });
});
