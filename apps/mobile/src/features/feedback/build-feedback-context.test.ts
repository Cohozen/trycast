import { describe, expect, it } from 'vitest';

import { buildFeedbackContext, screenPattern } from './build-feedback-context';
import type { FeedbackAppInfo } from './types';

const app: FeedbackAppInfo = {
    version: '1.1.0',
    build: '6',
    channel: 'production',
    updateId: 'abc-123',
    locale: 'fr',
    theme: 'dark',
};

describe('screenPattern', () => {
    it('retire les groupes Expo Router', () => {
        expect(screenPattern(['(app)', 'match', '[id]'])).toBe('match/[id]');
        expect(screenPattern(['(app)', '(tabs)', 'leaderboard'])).toBe('leaderboard');
    });

    it("nomme l'écran racine", () => {
        expect(screenPattern(['(app)', '(tabs)'])).toBe('index');
    });
});

describe('buildFeedbackContext', () => {
    it("joint l'écran, les identifiants et l'environnement", () => {
        const result = buildFeedbackContext(
            { pathname: '/match/42', segments: ['(app)', 'match', '[id]'], params: { id: '42' } },
            app,
        );
        expect(result).toEqual({
            url: '/match/42',
            tags: { screen: 'match/[id]', locale: 'fr', theme: 'dark', channel: 'production' },
            context: {
                pathname: '/match/42',
                'param.id': '42',
                version: '1.1.0',
                build: '6',
                updateId: 'abc-123',
            },
        });
    });

    it("n'envoie jamais le code d'invitation ni un paramètre inconnu", () => {
        const result = buildFeedbackContext(
            {
                pathname: '/league/new',
                segments: ['(app)', 'league', 'new'],
                params: { tab: 'join', code: 'ABCDEFGH', search: 'secret' },
            },
            app,
        );
        expect(result.context['param.tab']).toBe('join');
        expect(JSON.stringify(result)).not.toContain('ABCDEFGH');
        expect(JSON.stringify(result)).not.toContain('secret');
    });

    it('omet ce que le build local ne connaît pas', () => {
        const result = buildFeedbackContext(
            { pathname: '/', segments: ['(app)', '(tabs)'], params: {} },
            { ...app, channel: null, updateId: null, build: null, version: null },
        );
        expect(result.tags).not.toHaveProperty('channel');
        expect(result.context).toEqual({ pathname: '/' });
    });
});
