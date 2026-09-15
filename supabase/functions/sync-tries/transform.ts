// Logique pure de sync-tries : lecture des essais dans les encadrés {{rugbybox}}
// des pages Wikipedia EN, appariement avec nos matchs et contrôles avant écriture.
// Zéro I/O, zéro global Deno — testé sous Vitest sur des extraits réels.
//
// Aucun fournisseur de données ne publie les essais par équipe (spike Highlightly) :
// Wikipedia est la seule source exploitable, et elle est tenue par des bénévoles.
// D'où la règle : on n'écrit QUE si le décompte reconstitue le score au point près,
// et si ce score est celui que Highlightly nous a donné. Sinon, rejet motivé et
// repli sur la saisie admin. Aucun nom de joueur ne sort de ce module.
import { findTeamMetadata, TEAM_METADATA } from '../_shared/team-metadata.ts';

export type RugbyBox = {
    date: string;
    team1: string;
    team2: string;
    score: string;
    try1: string;
    con1: string;
    pen1: string;
    drop1: string;
    try2: string;
    con2: string;
    pen2: string;
    drop2: string;
};

const BOX_FIELDS = [
    'date',
    'team1',
    'team2',
    'score',
    'try1',
    'con1',
    'pen1',
    'drop1',
    'try2',
    'con2',
    'pen2',
    'drop2',
] as const;

/** Décompte d'un camp tel que l'encadré le rapporte. */
export type SideTally = {
    tries: number;
    penaltyTries: number;
    conversions: number;
    penalties: number;
    drops: number;
};

/** Match terminé en attente (ou, en audit, déjà pourvu) d'essais. */
export type TriesCandidate = {
    api_game_id: number;
    kickoff_at: string;
    home_code: string | null;
    away_code: string | null;
    home_score: number;
    away_score: number;
};

export type RejectReason = 'not_found' | 'ambiguous' | 'score_mismatch' | 'checksum_failed';

export type SourcedBox = { box: RugbyBox; revid: number };

export type TriesResolution =
    | { api_game_id: number; ok: true; home_tries: number; away_tries: number; revid: number }
    | { api_game_id: number; ok: false; reason: RejectReason };

// Valeurs d'un essai de pénalité (loi 2017 : 7 points d'office, sans transformation),
// d'un essai, d'une transformation, d'une pénalité et d'un drop.
const POINTS = { try: 5, penaltyTry: 7, conversion: 2, penalty: 3, drop: 3 };

// L'encadré porte la date locale du match, nous l'heure UTC du coup d'envoi :
// un match du soir en Océanie tombe la veille en UTC.
const DATE_TOLERANCE_DAYS = 1;

// Codes du modèle {{ru}} de Wikipedia qui diffèrent de nos tricodes
// (relevés le 2026-09-15 sur les pages 6 Nations 2026 et Nations Championship 2026).
const WIKIPEDIA_CODE_ALIASES: Record<string, string> = {
    IRE: 'IRL',
    TON: 'TGA',
    ROM: 'ROU',
    JAP: 'JPN',
};

const KNOWN_CODES = new Set(Object.values(TEAM_METADATA).map((metadata) => metadata.code));

const MONTHS: Record<string, number> = {
    january: 0,
    february: 1,
    march: 2,
    april: 3,
    may: 4,
    june: 5,
    july: 6,
    august: 7,
    september: 8,
    october: 9,
    november: 10,
    december: 11,
};

/**
 * Découpe les encadrés {{rugbybox}} d'une page. Les accolades et les liens sont
 * comptés : les champs contiennent {{ru|IRE}}, [[Lien|texte]] et des <ref>{{cite}}</ref>
 * dont les « | » ne séparent pas les champs de l'encadré.
 */
export function extractRugbyboxes(wikitext: string): RugbyBox[] {
    const text = wikitext.replace(/<!--[\s\S]*?-->/g, '');
    const lower = text.toLowerCase();
    const boxes: RugbyBox[] = [];
    let start = lower.indexOf('{{rugbybox');
    while (start !== -1) {
        const end = findTemplateEnd(text, start);
        if (end === -1) {
            break;
        }
        // Contenu entre « {{rugbybox » et les « }} » fermants
        boxes.push(parseBoxFields(text.slice(start + '{{rugbybox'.length, end - 2)));
        start = lower.indexOf('{{rugbybox', end);
    }
    return boxes;
}

/** Index juste après les « }} » qui ferment le modèle ouvert en `start`, -1 sinon. */
function findTemplateEnd(text: string, start: number): number {
    let depth = 0;
    let index = start;
    while (index < text.length) {
        if (text.startsWith('{{', index)) {
            depth += 1;
            index += 2;
        } else if (text.startsWith('}}', index)) {
            depth -= 1;
            index += 2;
            if (depth === 0) {
                return index;
            }
        } else {
            index += 1;
        }
    }
    return -1;
}

function parseBoxFields(body: string): RugbyBox {
    const box = Object.fromEntries(BOX_FIELDS.map((field) => [field, ''])) as RugbyBox;
    for (const part of splitTopLevel(body)) {
        const equals = part.indexOf('=');
        if (equals === -1) {
            continue;
        }
        const key = part.slice(0, equals).trim().toLowerCase();
        if ((BOX_FIELDS as readonly string[]).includes(key)) {
            box[key as keyof RugbyBox] = stripRefs(part.slice(equals + 1)).trim();
        }
    }
    return box;
}

/** Sépare sur les « | » hors modèles {{…}} et hors liens [[…]]. */
function splitTopLevel(body: string): string[] {
    const parts: string[] = [];
    let braces = 0;
    let brackets = 0;
    let current = '';
    for (let index = 0; index < body.length; index += 1) {
        const pair = body.slice(index, index + 2);
        if (pair === '{{' || pair === '}}' || pair === '[[' || pair === ']]') {
            if (pair === '{{') braces += 1;
            if (pair === '}}') braces -= 1;
            if (pair === '[[') brackets += 1;
            if (pair === ']]') brackets -= 1;
            current += pair;
            index += 1;
        } else if (body[index] === '|' && braces === 0 && brackets === 0) {
            parts.push(current);
            current = '';
        } else {
            current += body[index];
        }
    }
    parts.push(current);
    return parts;
}

function stripRefs(value: string): string {
    return value.replace(/<ref[^>]*\/>/gi, '').replace(/<ref[^>]*>[\s\S]*?<\/ref>/gi, '');
}

/**
 * Tricode d'équipe depuis « (1 BP) {{ru-rt|FRA}} ». Le modèle accepte aussi un
 * nom (« {{ru|Scotland}} »), résolu par la table des nations. null si inconnu.
 */
export function parseTeamCode(field: string): string | null {
    const match = /\{\{\s*ru(?:-rt)?\s*\|\s*([^|}]+?)\s*[|}]/i.exec(field);
    if (!match) {
        return null;
    }
    const raw = match[1];
    const upper = raw.toUpperCase();
    const code = WIKIPEDIA_CODE_ALIASES[upper] ?? upper;
    if (KNOWN_CODES.has(code)) {
        return code;
    }
    return findTeamMetadata(raw)?.code ?? null;
}

/** Score « 36–14 » (tiret demi-cadratin ou trait d'union). null si pas encore joué. */
export function parseBoxScore(field: string): { team1: number; team2: number } | null {
    const match = /(\d+)\s*[–—-]\s*(\d+)/.exec(field);
    return match ? { team1: Number(match[1]), team2: Number(match[2]) } : null;
}

/** Date « 5 February 2026 » ou « February 5, 2026 », en minuit UTC. */
export function parseBoxDate(field: string): Date | null {
    const dayFirst = /(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/.exec(field);
    const monthFirst = /([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})/.exec(field);
    const [day, month, year] = dayFirst
        ? [dayFirst[1], dayFirst[2], dayFirst[3]]
        : monthFirst
          ? [monthFirst[2], monthFirst[1], monthFirst[3]]
          : [];
    const monthIndex = month === undefined ? undefined : MONTHS[month.toLowerCase()];
    if (monthIndex === undefined) {
        return null;
    }
    return new Date(Date.UTC(Number(year), monthIndex, Number(day)));
}

/** Lignes d'un champ de marqueurs (une par joueur, séparées par <br />). */
function entries(field: string): string[] {
    return field
        .split(/<br\s*\/?>/i)
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0);
}

const MINUTE = /\d+(?:\+\d+)?'/g;

/**
 * Nombre d'actions d'une ligne : une minute par action (« 12' c, 46' c ») ;
 * à défaut le multiplicateur « (2) », à défaut une action.
 */
function countActions(entry: string): number {
    const minutes = entry.match(MINUTE)?.length ?? 0;
    if (minutes > 0) {
        return minutes;
    }
    const multiplier = /\((\d+)\)/.exec(entry);
    return multiplier ? Number(multiplier[1]) : 1;
}

/** Réussites d'un champ de buteurs : somme des « (x/y) », à défaut on compte les actions. */
function countKicks(field: string): number {
    return entries(field).reduce((total, entry) => {
        const ratio = /\((\d+)\s*\/\s*\d+\)/.exec(entry);
        return total + (ratio ? Number(ratio[1]) : countActions(entry));
    }, 0);
}

/** Décompte d'un camp. Les minutes font foi, la mention c/m est ignorée (souvent oubliée). */
export function parseSide(
    tries: string,
    conversions: string,
    penalties: string,
    drops: string,
): SideTally {
    let normal = 0;
    let penaltyTries = 0;
    for (const entry of entries(tries)) {
        if (/penalty try/i.test(entry)) {
            penaltyTries += countActions(entry);
        } else {
            normal += countActions(entry);
        }
    }
    return {
        tries: normal,
        penaltyTries,
        conversions: countKicks(conversions),
        penalties: countKicks(penalties),
        drops: countKicks(drops),
    };
}

/** Le décompte reconstitue-t-il le score au point près ? */
export function checkSide(tally: SideTally, score: number): boolean {
    const points =
        POINTS.try * tally.tries +
        POINTS.penaltyTry * tally.penaltyTries +
        POINTS.conversion * tally.conversions +
        POINTS.penalty * tally.penalties +
        POINTS.drop * tally.drops;
    return points === score;
}

/**
 * Résout les essais de chaque match candidat. Écriture autorisée seulement si :
 * un unique encadré apparié (équipes + date ±1 j), son score égal au nôtre, et
 * le décompte des deux camps cohérent avec ce score. Un essai de pénalité compte
 * comme un essai (il vaut pour le bonus offensif).
 */
export function resolveTries(boxes: SourcedBox[], candidates: TriesCandidate[]): TriesResolution[] {
    const parsed = boxes.map(({ box, revid }) => ({
        box,
        revid,
        team1: parseTeamCode(box.team1),
        team2: parseTeamCode(box.team2),
        date: parseBoxDate(box.date),
    }));

    return candidates.map((candidate): TriesResolution => {
        const kickoff = new Date(candidate.kickoff_at);
        const kickoffDay = Date.UTC(
            kickoff.getUTCFullYear(),
            kickoff.getUTCMonth(),
            kickoff.getUTCDate(),
        );
        const matching = parsed.filter((entry) => {
            if (
                entry.date === null ||
                candidate.home_code === null ||
                candidate.away_code === null
            ) {
                return false;
            }
            const days = Math.abs(entry.date.getTime() - kickoffDay) / 86_400_000;
            if (days > DATE_TOLERANCE_DAYS) {
                return false;
            }
            const straight =
                entry.team1 === candidate.home_code && entry.team2 === candidate.away_code;
            const reversed =
                entry.team1 === candidate.away_code && entry.team2 === candidate.home_code;
            return straight || reversed;
        });

        if (matching.length === 0) {
            return { api_game_id: candidate.api_game_id, ok: false, reason: 'not_found' };
        }
        if (matching.length > 1) {
            return { api_game_id: candidate.api_game_id, ok: false, reason: 'ambiguous' };
        }

        const [{ box, revid, team1 }] = matching;
        const score = parseBoxScore(box.score);
        if (score === null) {
            // Encadré présent mais pas encore rempli : on repassera
            return { api_game_id: candidate.api_game_id, ok: false, reason: 'not_found' };
        }
        const side1 = parseSide(box.try1, box.con1, box.pen1, box.drop1);
        const side2 = parseSide(box.try2, box.con2, box.pen2, box.drop2);
        // Terrain neutre ou saisie inversée : l'encadré peut lister l'extérieur en premier
        const homeIsTeam1 = team1 === candidate.home_code;
        const [home, away] = homeIsTeam1 ? [side1, side2] : [side2, side1];
        const [homeScore, awayScore] = homeIsTeam1
            ? [score.team1, score.team2]
            : [score.team2, score.team1];

        if (homeScore !== candidate.home_score || awayScore !== candidate.away_score) {
            return { api_game_id: candidate.api_game_id, ok: false, reason: 'score_mismatch' };
        }
        if (!checkSide(home, homeScore) || !checkSide(away, awayScore)) {
            return { api_game_id: candidate.api_game_id, ok: false, reason: 'checksum_failed' };
        }
        return {
            api_game_id: candidate.api_game_id,
            ok: true,
            home_tries: home.tries + home.penaltyTries,
            away_tries: away.tries + away.penaltyTries,
            revid,
        };
    });
}
