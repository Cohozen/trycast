import { describe, expect, it } from 'vitest';

import { buildRoundHighlights, type RoundHighlightInputRow } from './round-highlight';

function row(overrides: Partial<RoundHighlightInputRow>): RoundHighlightInputRow {
    return {
        round: '3',
        stage_key: '',
        stage_kind: '',
        round_key: '3',
        match_id: 'm1',
        user_id: 'u1',
        username: 'Sofia',
        avatar_url: null,
        predicted_home_score: 17,
        predicted_away_score: 24,
        points: 21,
        is_exact: false,
        is_joker: false,
        is_draw: false,
        is_outsider: false,
        crowd_outcome: 'home',
        crowd_count: 7,
        winners_count: 2,
        predictions_count: 9,
        ...overrides,
    };
}

describe('buildRoundHighlights', () => {
    it('regroupe par journée', () => {
        const highlights = buildRoundHighlights(
            [row({}), row({ round_key: 'stage:final', user_id: 'u2' })],
            undefined,
        );
        expect([...highlights.keys()]).toEqual(['3', 'stage:final']);
    });

    it('lauréat seul contre la ligue : ni badge ni variante particulière', () => {
        const highlight = buildRoundHighlights([row({})], 'u9').get('3')!;
        expect(highlight).toMatchObject({
            audience: 'other',
            variant: 'league',
            accroche: 'league',
            badges: [],
            sameMatch: true,
            story: { crowdOutcome: 'home', crowdCount: 7, winners: 2, total: 9, draw: false },
        });
    });

    it('préséance du titre : exact > nul > outsider > joker', () => {
        const variant = (overrides: Partial<RoundHighlightInputRow>) =>
            buildRoundHighlights([row(overrides)], undefined).get('3')!.variant;
        expect(variant({ is_exact: true, is_draw: true, is_outsider: true, is_joker: true })).toBe(
            'exact',
        );
        expect(variant({ is_draw: true, is_joker: true })).toBe('draw');
        expect(variant({ is_outsider: true, is_joker: true })).toBe('outsider');
        expect(variant({ is_joker: true })).toBe('joker');
    });

    it('outsider avec joker : accroche dédiée, les deux en badges', () => {
        const highlight = buildRoundHighlights(
            [row({ is_outsider: true, is_joker: true })],
            undefined,
        ).get('3')!;
        expect(highlight.accroche).toBe('outsiderJoker');
        expect(highlight.badges).toEqual(['joker', 'outsider']);
    });

    it('le lauréat, c’est moi', () => {
        const highlight = buildRoundHighlights([row({})], 'u1').get('3')!;
        expect(highlight.audience).toBe('me');
        expect(highlight.laureates[0].isMe).toBe(true);
    });

    it('nul pronostiqué : l’histoire le dit', () => {
        const highlight = buildRoundHighlights(
            [row({ is_draw: true, winners_count: 1, crowd_count: 8 })],
            undefined,
        ).get('3')!;
        expect(highlight.story.draw).toBe(true);
        expect(highlight.badges).toEqual(['draw']);
    });

    it('deux ex æquo sur le même match : un seul match compté', () => {
        const highlight = buildRoundHighlights(
            [row({}), row({ user_id: 'u2', username: 'Yanis', is_joker: true })],
            undefined,
        ).get('3')!;
        expect(highlight).toMatchObject({
            audience: 'duo',
            sameMatch: true,
            badges: ['tie', 'joker'],
            story: { crowdCount: 7, winners: 2, total: 9 },
        });
    });

    it('deux ex æquo sur deux matchs : les histoires s’additionnent', () => {
        const highlight = buildRoundHighlights(
            [
                row({}),
                row({
                    user_id: 'u2',
                    match_id: 'm2',
                    crowd_count: 5,
                    winners_count: 1,
                    predictions_count: 6,
                }),
            ],
            undefined,
        ).get('3')!;
        expect(highlight).toMatchObject({
            audience: 'duoSplit',
            sameMatch: false,
            badges: ['tie'],
            story: { crowdCount: 12, winners: 3, total: 15, draw: false },
        });
    });

    it('trois ex æquo', () => {
        const highlight = buildRoundHighlights(
            [row({}), row({ user_id: 'u2' }), row({ user_id: 'u3', match_id: 'm2' })],
            undefined,
        ).get('3')!;
        expect(highlight.audience).toBe('trio');
    });
});
