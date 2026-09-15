// Miroir client de la palette du check leagues_color_allowed
// (20260716000100_league_color.sql) — toute évolution touche les deux
// fichiers. Hex en dur assumés : ce sont des DONNÉES (valeurs stockées en
// base, rendues via style backgroundColor), pas des tokens du design system.
// Le grenat accent est volontairement exclu (étincelle UI, jamais un fond).

export const LEAGUE_COLORS = [
    '#14432A',
    '#2A6FDB',
    '#1F8A6B',
    '#E0952A',
    '#7A4F9E',
    '#3C4657',
] as const;

export type LeagueColor = (typeof LEAGUE_COLORS)[number];

export const DEFAULT_LEAGUE_COLOR: LeagueColor = LEAGUE_COLORS[0];

/** Couleur stockée en base → couleur sûre pour le rendu (défaut si inconnue). */
export function leagueColorOf(raw: string | null | undefined): LeagueColor {
    return (LEAGUE_COLORS as readonly string[]).includes(raw ?? '')
        ? (raw as LeagueColor)
        : DEFAULT_LEAGUE_COLOR;
}
