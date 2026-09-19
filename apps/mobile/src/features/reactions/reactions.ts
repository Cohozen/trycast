/**
 * Les quatre réactions sur un prono, dans leur ordre d'affichage fixe
 * (popover, puces, filtres de la sheet). La clé est ce que stocke le serveur
 * — contrainte `check` de `prediction_reactions`, à garder alignée — et
 * l'emoji n'est qu'un rendu : des pictos maison le remplaceront sans
 * migration (cf. `ReactionEmoji`).
 */
export const REACTIONS = [
    { key: 'bravo', emoji: '👏' },
    { key: 'lucky', emoji: '🍀' },
    { key: 'bold', emoji: '😲' },
    { key: 'laugh', emoji: '😂' },
] as const;

export type ReactionKey = (typeof REACTIONS)[number]['key'];

/** Nombre de réactions reçues par clé ; une clé absente vaut 0. */
export type ReactionCounts = Partial<Record<ReactionKey, number>>;

export type ReactionChipData = {
    key: ReactionKey;
    emoji: string;
    count: number;
    /** La puce contient ma propre réaction. */
    mine: boolean;
};

const KEYS: readonly string[] = REACTIONS.map((reaction) => reaction.key);

export function isReactionKey(value: unknown): value is ReactionKey {
    return typeof value === 'string' && KEYS.includes(value);
}

/**
 * Lit les compteurs renvoyés par `get_match_league_predictions` (jsonb, donc
 * `Json` côté types) en ne gardant que des clés connues et des entiers
 * positifs : un serveur plus récent qui ajouterait une réaction ne doit pas
 * faire apparaître une puce vide dans un client ancien.
 */
export function parseReactionCounts(value: unknown): ReactionCounts {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return {};
    const counts: ReactionCounts = {};
    for (const [key, count] of Object.entries(value)) {
        if (isReactionKey(key) && typeof count === 'number' && count > 0) {
            counts[key] = Math.floor(count);
        }
    }
    return counts;
}

/**
 * Compteurs après que je passe de `previous` à `next` (null = aucune
 * réaction) : sert la mise à jour optimiste. Une clé retombée à 0 disparaît,
 * pour que sa puce s'efface.
 */
export function applyReaction(
    counts: ReactionCounts,
    previous: ReactionKey | null,
    next: ReactionKey | null,
): ReactionCounts {
    if (previous === next) return counts;
    const result: ReactionCounts = { ...counts };
    if (previous) {
        const left = (result[previous] ?? 0) - 1;
        if (left > 0) result[previous] = left;
        else delete result[previous];
    }
    if (next) result[next] = (result[next] ?? 0) + 1;
    return result;
}

/** Puces à afficher sous une ligne : réactions présentes, dans l'ordre fixe. */
export function toReactionChips(
    counts: ReactionCounts,
    mine: ReactionKey | null,
): ReactionChipData[] {
    return REACTIONS.filter(({ key }) => (counts[key] ?? 0) > 0).map(({ key, emoji }) => ({
        key,
        emoji,
        count: counts[key] ?? 0,
        mine: mine === key,
    }));
}

/** Total des réactions reçues (sous-titre de la sheet). */
export function totalReactions(counts: ReactionCounts): number {
    return REACTIONS.reduce((sum, { key }) => sum + (counts[key] ?? 0), 0);
}

/** Emoji d'une clé (la clé est toujours connue une fois typée). */
export function reactionEmoji(key: ReactionKey): string {
    return REACTIONS.find((reaction) => reaction.key === key)?.emoji ?? '';
}
