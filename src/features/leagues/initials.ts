/**
 * Initiales affichées dans le pavé d'identité d'une ligue (LeagueIcon) :
 * deux premières lettres d'un nom en un mot, initiales des deux premiers mots
 * sinon — même règle que la maquette « Créer ou rejoindre une ligue ».
 */
export function initialsOf(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
}
