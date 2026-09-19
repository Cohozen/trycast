import { describe, expect, it } from 'vitest';

import { noteErrorEvent, RECENT_ERROR_WINDOW_MS, recentErrorEventId } from './recent-error';

describe('recentErrorEventId', () => {
    it("ne relie rien tant qu'aucune erreur n'est partie", () => {
        expect(recentErrorEventId(0)).toBeUndefined();
    });

    it('relie la dernière erreur dans la fenêtre, plus au-delà', () => {
        noteErrorEvent('first', 1_000);
        noteErrorEvent('second', 2_000);
        expect(recentErrorEventId(2_000 + RECENT_ERROR_WINDOW_MS)).toBe('second');
        expect(recentErrorEventId(2_001 + RECENT_ERROR_WINDOW_MS)).toBeUndefined();
    });

    it('ignore un événement sans identifiant', () => {
        noteErrorEvent('kept', 5_000);
        noteErrorEvent(undefined, 6_000);
        expect(recentErrorEventId(6_000)).toBe('kept');
    });
});
