// Métadonnées neutres des nations du rugby (Lot 2) — IP-safe : tricode, emoji
// drapeau Unicode et couleur dominante de maillot uniquement, aucun logo officiel.
// Clé = nom d'équipe tel que renvoyé par API-Sports (lookup normalisé via
// findTeamMetadata). Module pur (zéro import) : consommé par l'EF sync-fixtures
// et testé sous Vitest.

export type TeamMetadata = {
    code: string;
    flagEmoji: string;
    color: string;
};

export const TEAM_METADATA: Record<string, TeamMetadata> = {
    // The Rugby Championship
    'New Zealand': { code: 'NZL', flagEmoji: '🇳🇿', color: '#000000' },
    'South Africa': { code: 'RSA', flagEmoji: '🇿🇦', color: '#007A4D' },
    Australia: { code: 'AUS', flagEmoji: '🇦🇺', color: '#F5B800' },
    Argentina: { code: 'ARG', flagEmoji: '🇦🇷', color: '#6CACE4' },
    // Six Nations
    France: { code: 'FRA', flagEmoji: '🇫🇷', color: '#1E3A8A' },
    England: { code: 'ENG', flagEmoji: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', color: '#FFFFFF' },
    Ireland: { code: 'IRL', flagEmoji: '🇮🇪', color: '#00843D' },
    Wales: { code: 'WAL', flagEmoji: '🏴󠁧󠁢󠁷󠁬󠁳󠁿', color: '#C8102E' },
    Scotland: { code: 'SCO', flagEmoji: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', color: '#003087' },
    Italy: { code: 'ITA', flagEmoji: '🇮🇹', color: '#0066B2' },
    // Vivier Coupe du monde
    Japan: { code: 'JPN', flagEmoji: '🇯🇵', color: '#B01E28' },
    Fiji: { code: 'FIJ', flagEmoji: '🇫🇯', color: '#FFFFFF' },
    Samoa: { code: 'SAM', flagEmoji: '🇼🇸', color: '#002B7F' },
    Tonga: { code: 'TGA', flagEmoji: '🇹🇴', color: '#C10000' },
    Georgia: { code: 'GEO', flagEmoji: '🇬🇪', color: '#DA291C' },
    Portugal: { code: 'POR', flagEmoji: '🇵🇹', color: '#DA291C' },
    Romania: { code: 'ROU', flagEmoji: '🇷🇴', color: '#FFCD00' },
    Spain: { code: 'ESP', flagEmoji: '🇪🇸', color: '#AA151B' },
    USA: { code: 'USA', flagEmoji: '🇺🇸', color: '#002868' },
    Canada: { code: 'CAN', flagEmoji: '🇨🇦', color: '#D80621' },
    Uruguay: { code: 'URU', flagEmoji: '🇺🇾', color: '#7BAFD4' },
    Chile: { code: 'CHI', flagEmoji: '🇨🇱', color: '#D52B1E' },
    Namibia: { code: 'NAM', flagEmoji: '🇳🇦', color: '#003580' },
    Zimbabwe: { code: 'ZIM', flagEmoji: '🇿🇼', color: '#319B42' },
    'Hong Kong': { code: 'HKG', flagEmoji: '🇭🇰', color: '#DE2910' },
    Netherlands: { code: 'NED', flagEmoji: '🇳🇱', color: '#FF6600' },
    Belgium: { code: 'BEL', flagEmoji: '🇧🇪', color: '#000000' },
    Germany: { code: 'GER', flagEmoji: '🇩🇪', color: '#FFFFFF' },
    Russia: { code: 'RUS', flagEmoji: '🇷🇺', color: '#D52B1E' },
    Kenya: { code: 'KEN', flagEmoji: '🇰🇪', color: '#BB0000' },
    'Ivory Coast': { code: 'CIV', flagEmoji: '🇨🇮', color: '#FF8200' },
};

const normalized: Record<string, TeamMetadata> = {};
for (const [name, metadata] of Object.entries(TEAM_METADATA)) {
    normalized[name.trim().toLowerCase()] = metadata;
}

// Noms alternatifs utilisés par Highlightly → nation du mapping
// (constaté sur le Nations Championship 2026 : les Fidji y jouent sous « Fijian Drua »)
const TEAM_ALIASES: Record<string, string> = {
    'fijian drua': 'fiji',
};

/** Lookup tolérant (trim, insensible à la casse, alias). Null si nation hors mapping. */
export function findTeamMetadata(apiName: string): TeamMetadata | null {
    const key = apiName.trim().toLowerCase();
    return normalized[TEAM_ALIASES[key] ?? key] ?? null;
}
