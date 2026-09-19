import { describe, expect, it } from 'vitest';

import {
    applyReaction,
    isReactionKey,
    parseReactionCounts,
    REACTIONS,
    toReactionChips,
    totalReactions,
} from '@/features/reactions/reactions';

describe('REACTIONS', () => {
    it('garde l’ordre d’affichage et les clés de la contrainte SQL', () => {
        expect(REACTIONS.map((reaction) => reaction.key)).toEqual([
            'bravo',
            'lucky',
            'bold',
            'laugh',
        ]);
    });
});

describe('isReactionKey', () => {
    it('n’admet que les quatre clés', () => {
        expect(isReactionKey('lucky')).toBe(true);
        expect(isReactionKey('fire')).toBe(false);
        expect(isReactionKey(null)).toBe(false);
    });
});

describe('parseReactionCounts', () => {
    it('lit les compteurs du serveur', () => {
        expect(parseReactionCounts({ bravo: 3, laugh: 1 })).toEqual({ bravo: 3, laugh: 1 });
    });

    it('écarte les clés inconnues et les valeurs invalides', () => {
        expect(parseReactionCounts({ bravo: 2, fire: 4, bold: 0, lucky: '3' })).toEqual({
            bravo: 2,
        });
    });

    it('rend un objet vide pour tout ce qui n’est pas un objet', () => {
        expect(parseReactionCounts(null)).toEqual({});
        expect(parseReactionCounts([1, 2])).toEqual({});
        expect(parseReactionCounts('bravo')).toEqual({});
    });
});

describe('applyReaction', () => {
    it('ajoute une première réaction', () => {
        expect(applyReaction({}, null, 'bravo')).toEqual({ bravo: 1 });
    });

    it('déplace ma réaction d’une clé à l’autre', () => {
        expect(applyReaction({ bravo: 2, lucky: 1 }, 'bravo', 'lucky')).toEqual({
            bravo: 1,
            lucky: 2,
        });
    });

    it('retire la clé quand son compteur retombe à 0', () => {
        expect(applyReaction({ bold: 1, laugh: 3 }, 'bold', null)).toEqual({ laugh: 3 });
    });

    it('ne change rien quand la réaction ne bouge pas', () => {
        const counts = { bravo: 1 };
        expect(applyReaction(counts, 'bravo', 'bravo')).toBe(counts);
    });
});

describe('toReactionChips', () => {
    it('suit l’ordre fixe et marque ma réaction', () => {
        expect(toReactionChips({ laugh: 1, bravo: 3 }, 'laugh')).toEqual([
            { key: 'bravo', emoji: '👏', count: 3, mine: false },
            { key: 'laugh', emoji: '😂', count: 1, mine: true },
        ]);
    });

    it('ne rend aucune puce sans réaction', () => {
        expect(toReactionChips({}, null)).toEqual([]);
    });
});

describe('totalReactions', () => {
    it('additionne les compteurs', () => {
        expect(totalReactions({ bravo: 3, lucky: 4, bold: 1 })).toBe(8);
        expect(totalReactions({})).toBe(0);
    });
});
