import { describe, expect, it } from 'vitest';

import { maskBlocked } from './block';

const rows = [
    { user_id: 'a', username: 'Alice', avatar_url: 'https://x/a.jpg', rank: 1 },
    { user_id: 'b', username: 'Bob', avatar_url: 'https://x/b.jpg', rank: 2 },
    { user_id: null, username: null, avatar_url: null, rank: 3 },
];

describe('maskBlocked', () => {
    it('masque pseudo et photo des joueurs bloqués, sans toucher au reste', () => {
        expect(maskBlocked(rows, new Set(['b']), 'Joueur masqué')).toEqual([
            rows[0],
            { user_id: 'b', username: 'Joueur masqué', avatar_url: null, rank: 2 },
            rows[2],
        ]);
    });

    it('rend la liste telle quelle sans blocage', () => {
        expect(maskBlocked(rows, new Set(), 'Joueur masqué')).toBe(rows);
    });
});
