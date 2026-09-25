/** Une ligne qui montre un joueur : classements, pronos d'un match, coup de la journée. */
type PlayerRow = {
    user_id: string | null;
    username: string | null;
    avatar_url: string | null;
};

/**
 * Masque les joueurs que j'ai bloqués : pseudo remplacé par `label`
 * (« Joueur masqué », déjà traduit), photo retirée. La ligne reste, avec son
 * `user_id` : le rang ne bouge pas et le profil reste ouvrable, ce qui permet
 * de débloquer. Le blocage est une préférence d'affichage, pas une règle de
 * sécurité : ses réactions, elles, sont filtrées par le serveur.
 */
export function maskBlocked<T extends PlayerRow>(
    rows: T[],
    blockedIds: ReadonlySet<string>,
    label: string,
): T[] {
    if (blockedIds.size === 0) return rows;
    return rows.map((row) =>
        row.user_id && blockedIds.has(row.user_id)
            ? { ...row, username: label, avatar_url: null }
            : row,
    );
}
