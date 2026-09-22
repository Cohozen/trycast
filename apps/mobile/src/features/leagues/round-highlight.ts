import type { RoundHighlightRow } from './types';

/**
 * Le typegen ne voit pas la nullabilité d'un RETURNS TABLE : avatar_url est
 * nullable en base (cf. RoundPointsInputRow). Seules les colonnes lues ici.
 */
export type RoundHighlightInputRow = Omit<RoundHighlightRow, 'avatar_url'> & {
    avatar_url: string | null;
};

/** Ce qui fait le titre d'un lauréat seul, par ordre de préséance (DS 2026-09-21). */
export type HighlightVariant = 'exact' | 'draw' | 'outsider' | 'joker' | 'league';

/** Qui porte le coup : un autre membre, moi, ou des ex æquo. */
export type HighlightAudience = 'other' | 'me' | 'duo' | 'duoSplit' | 'trio';

export type HighlightBadge = 'tie' | 'joker' | 'exact' | 'draw' | 'outsider';

/** Issue d'un match, dans le vocabulaire de la RPC (crowd_outcome). */
export type Outcome = 'home' | 'draw' | 'away';

export type HighlightLaureate = {
    userId: string;
    username: string;
    avatarUrl: string | null;
    matchId: string;
    predictedHome: number;
    predictedAway: number;
    points: number;
    isJoker: boolean;
    isMe: boolean;
};

export type RoundHighlight = {
    /** Clé de journée, partagée avec la bande (roundGroupKey). */
    key: string;
    audience: HighlightAudience;
    /** Titre d'un lauréat seul ; les ex æquo ont le leur (audience). */
    variant: HighlightVariant;
    /** Accroche : variante du titre, sauf outsider + joker qui a la sienne. */
    accroche: HighlightVariant | 'outsiderJoker';
    badges: HighlightBadge[];
    laureates: HighlightLaureate[];
    /** Tous les lauréats sur le même match : bandeau du match en tête. */
    sameMatch: boolean;
    /** L'histoire contre la ligue (barre foule / lauréats). */
    story: {
        /** Même match : l'issue la plus pronostiquée par la ligue. */
        crowdOutcome: Outcome;
        crowdCount: number;
        winners: number;
        total: number;
        /** L'issue réelle était un nul. */
        draw: boolean;
    };
};

/**
 * Regroupe les lauréats de get_league_round_highlights par journée et choisit
 * la mise en scène de chaque coup. Le serveur a déjà tranché qui mérite le coup
 * (contre la majorité, 3 ex æquo au plus) : ici, rien que de la présentation.
 */
export function buildRoundHighlights(
    rows: readonly RoundHighlightInputRow[],
    userId: string | undefined,
): Map<string, RoundHighlight> {
    const byKey = new Map<string, RoundHighlightInputRow[]>();
    for (const row of rows) {
        const group = byKey.get(row.round_key) ?? [];
        group.push(row);
        byKey.set(row.round_key, group);
    }

    const highlights = new Map<string, RoundHighlight>();
    for (const [key, group] of byKey) {
        highlights.set(key, toHighlight(key, group, userId));
    }
    return highlights;
}

function toHighlight(
    key: string,
    group: RoundHighlightInputRow[],
    userId: string | undefined,
): RoundHighlight {
    const laureates = group.map<HighlightLaureate>((row) => ({
        userId: row.user_id,
        username: row.username,
        avatarUrl: row.avatar_url,
        matchId: row.match_id,
        predictedHome: row.predicted_home_score,
        predictedAway: row.predicted_away_score,
        points: row.points,
        isJoker: row.is_joker,
        isMe: row.user_id === userId,
    }));
    const [first] = group;
    const sameMatch = group.every((row) => row.match_id === first.match_id);
    const variant = variantOf(first);

    // Un match compté une fois, même s'il a plusieurs lauréats
    const perMatch = new Map(group.map((row) => [row.match_id, row]));
    const matchRows = [...perMatch.values()];
    const story = {
        crowdOutcome: first.crowd_outcome as Outcome,
        crowdCount: matchRows.reduce((sum, row) => sum + row.crowd_count, 0),
        winners: matchRows.reduce((sum, row) => sum + row.winners_count, 0),
        total: matchRows.reduce((sum, row) => sum + row.predictions_count, 0),
        draw: sameMatch && first.is_draw,
    };

    if (group.length > 1) {
        return {
            key,
            audience: group.length === 3 ? 'trio' : sameMatch ? 'duo' : 'duoSplit',
            variant,
            accroche: variant,
            badges: group.some((row) => row.is_joker) ? ['tie', 'joker'] : ['tie'],
            laureates,
            sameMatch,
            story,
        };
    }

    const badges: HighlightBadge[] = [];
    if (first.is_joker) badges.push('joker');
    if (first.is_exact) badges.push('exact');
    if (first.is_draw) badges.push('draw');
    if (first.is_outsider) badges.push('outsider');

    return {
        key,
        audience: laureates[0].isMe ? 'me' : 'other',
        variant,
        accroche: variant === 'outsider' && first.is_joker ? 'outsiderJoker' : variant,
        badges,
        laureates,
        sameMatch,
        story,
    };
}

/** Préséance du DS : score exact > nul osé > outsider > joker > contre la ligue. */
function variantOf(row: RoundHighlightInputRow): HighlightVariant {
    if (row.is_exact) return 'exact';
    if (row.is_draw) return 'draw';
    if (row.is_outsider) return 'outsider';
    if (row.is_joker) return 'joker';
    return 'league';
}
