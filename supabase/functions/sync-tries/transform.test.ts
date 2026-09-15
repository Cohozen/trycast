import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
    checkSide,
    extractRugbyboxes,
    parseBoxDate,
    parseBoxScore,
    parseSide,
    parseTeamCode,
    type RugbyBox,
    resolveTries,
    type TriesCandidate,
} from './transform.ts';

// Encadrés bruts relevés sur en.wikipedia.org le 2026-09-15 (provenance en tête de fichier)
function fixture(name: string): string {
    return readFileSync(path.join(__dirname, 'fixtures', `${name}.wikitext`), 'utf8');
}

function onlyBox(name: string): RugbyBox {
    const boxes = extractRugbyboxes(fixture(name));
    expect(boxes).toHaveLength(1);
    return boxes[0];
}

const FRANCE_IRELAND: TriesCandidate = {
    api_game_id: 1,
    kickoff_at: '2026-02-05T20:10:00Z',
    home_code: 'FRA',
    away_code: 'IRL',
    home_score: 36,
    away_score: 14,
};

const ARGENTINA_ENGLAND: TriesCandidate = {
    api_game_id: 2,
    kickoff_at: '2026-07-18T19:10:00Z',
    home_code: 'ARG',
    away_code: 'ENG',
    home_score: 24,
    away_score: 31,
};

describe('extractRugbyboxes', () => {
    it('lit les champs sans se laisser couper par les liens, modèles et refs imbriqués', () => {
        const box = onlyBox('france-ireland');
        expect(box.date).toBe('5 February 2026');
        expect(box.team1).toBe('(1 BP) {{ru-rt|FRA}}');
        expect(box.team2).toBe('{{ru|IRE}}');
        expect(box.score).toBe('36–14');
        expect(box.con1).toBe("[[Thomas Ramos (rugby union)|Ramos]] (4/5) 13', 34', 47', 80+1'");
        expect(box.drop1).toBe('');
    });

    it('découpe plusieurs encadrés d’une même page, prose et commentaires compris', () => {
        const page = `Intro [[Six Nations]].\n${fixture('france-ireland')}\n==Round 2==\n${fixture('ireland-argentina-unplayed')}`;
        const boxes = extractRugbyboxes(page);
        expect(boxes.map((box) => box.date)).toEqual(['5 February 2026', '6 November 2026']);
    });

    it('ignore la casse du nom du modèle', () => {
        expect(extractRugbyboxes('{{Rugbybox\n|score = 10–3\n}}')[0].score).toBe('10–3');
    });
});

describe('parseTeamCode', () => {
    it('lit ru et ru-rt, ignore le bonus, traduit les codes Wikipedia', () => {
        expect(parseTeamCode('(1 BP) {{ru-rt|FRA}}')).toBe('FRA');
        expect(parseTeamCode('{{ru|IRE}}')).toBe('IRL');
        expect(parseTeamCode('{{ru|ENG}} (1 BP)')).toBe('ENG');
        expect(parseTeamCode('{{ru|TON}}')).toBe('TGA');
        expect(parseTeamCode('{{ru|ROM}}')).toBe('ROU');
    });

    it('résout un nom de nation passé au modèle', () => {
        expect(parseTeamCode('{{ru-rt|Scotland}}')).toBe('SCO');
    });

    it('rend null pour une équipe inconnue ou un libellé provisoire', () => {
        expect(parseTeamCode('Northern 6')).toBeNull();
        expect(parseTeamCode('{{ru|XYZ}}')).toBeNull();
    });
});

describe('parseBoxScore / parseBoxDate', () => {
    it('lit le score, null tant que le match n’est pas joué', () => {
        expect(parseBoxScore('36–14')).toEqual({ team1: 36, team2: 14 });
        expect(parseBoxScore('24-31')).toEqual({ team1: 24, team2: 31 });
        expect(parseBoxScore('')).toBeNull();
    });

    it('lit les deux ordres de date', () => {
        expect(parseBoxDate('5 February 2026')?.toISOString()).toBe('2026-02-05T00:00:00.000Z');
        expect(parseBoxDate('July 18, 2026')?.toISOString()).toBe('2026-07-18T00:00:00.000Z');
        expect(parseBoxDate('TBC')).toBeNull();
    });
});

describe('parseSide / checkSide', () => {
    it('compte une minute par essai et somme les (x/y) des buteurs', () => {
        const box = onlyBox('france-ireland');
        const france = parseSide(box.try1, box.con1, box.pen1, box.drop1);
        expect(france).toEqual({
            tries: 5,
            penaltyTries: 0,
            conversions: 4,
            penalties: 1,
            drops: 0,
        });
        expect(checkSide(france, 36)).toBe(true);
        expect(checkSide(france, 38)).toBe(false);
    });

    it('compte l’essai de pénalité à 7 points, sans transformation', () => {
        const box = onlyBox('argentina-england');
        const argentina = parseSide(box.try1, box.con1, box.pen1, box.drop1);
        expect(argentina).toEqual({
            tries: 2,
            penaltyTries: 1,
            conversions: 2,
            penalties: 1,
            drops: 0,
        });
        expect(checkSide(argentina, 24)).toBe(true);
    });

    it('compte un essai dont la mention c/m a été oubliée', () => {
        const box = onlyBox('argentina-england');
        const england = parseSide(box.try2, box.con2, box.pen2, box.drop2);
        expect(england.tries).toBe(5);
        expect(checkSide(england, 31)).toBe(true);
    });

    it('se rabat sur les minutes quand un buteur n’a pas de ratio', () => {
        expect(parseSide('', "[[A]] 10', 20'", '', "[[B]] 40'")).toMatchObject({
            conversions: 2,
            drops: 1,
        });
    });
});

describe('resolveTries', () => {
    const sourced = (name: string, revid = 42) =>
        extractRugbyboxes(fixture(name)).map((box) => ({ box, revid }));

    it('résout un match nominal avec la révision de la page', () => {
        expect(resolveTries(sourced('france-ireland'), [FRANCE_IRELAND])).toEqual([
            { api_game_id: 1, ok: true, home_tries: 5, away_tries: 2, revid: 42 },
        ]);
    });

    it('inclut l’essai de pénalité dans le total écrit', () => {
        expect(resolveTries(sourced('argentina-england'), [ARGENTINA_ENGLAND])).toEqual([
            { api_game_id: 2, ok: true, home_tries: 3, away_tries: 5, revid: 42 },
        ]);
    });

    it('tolère un jour d’écart entre date locale et coup d’envoi UTC', () => {
        const eve = { ...FRANCE_IRELAND, kickoff_at: '2026-02-04T23:30:00Z' };
        const late = { ...FRANCE_IRELAND, kickoff_at: '2026-02-07T20:10:00Z' };
        const [ok, missed] = resolveTries(sourced('france-ireland'), [eve, late]);
        expect(ok.ok).toBe(true);
        expect(missed).toEqual({ api_game_id: 1, ok: false, reason: 'not_found' });
    });

    it('retourne les camps d’un encadré listant l’extérieur en premier', () => {
        // Fabriqué : l'encadré France-Irlande vu depuis un match où l'Irlande reçoit
        const reversed = {
            ...FRANCE_IRELAND,
            home_code: 'IRL',
            away_code: 'FRA',
            home_score: 14,
            away_score: 36,
        };
        expect(resolveTries(sourced('france-ireland'), [reversed])).toEqual([
            { api_game_id: 1, ok: true, home_tries: 2, away_tries: 5, revid: 42 },
        ]);
    });

    it('rejette un match sans encadré, ou dont l’encadré n’est pas encore rempli', () => {
        const unplayed: TriesCandidate = {
            api_game_id: 3,
            kickoff_at: '2026-11-06T20:10:00Z',
            home_code: 'IRL',
            away_code: 'ARG',
            home_score: 20,
            away_score: 10,
        };
        const noTeams = { ...FRANCE_IRELAND, home_code: null };
        expect(
            resolveTries(sourced('ireland-argentina-unplayed'), [
                unplayed,
                FRANCE_IRELAND,
                noTeams,
            ]),
        ).toEqual([
            { api_game_id: 3, ok: false, reason: 'not_found' },
            { api_game_id: 1, ok: false, reason: 'not_found' },
            { api_game_id: 1, ok: false, reason: 'not_found' },
        ]);
    });

    it('rejette deux encadrés pour le même match', () => {
        const twice = [...sourced('france-ireland', 1), ...sourced('france-ireland', 2)];
        expect(resolveTries(twice, [FRANCE_IRELAND])).toEqual([
            { api_game_id: 1, ok: false, reason: 'ambiguous' },
        ]);
    });

    it('rejette un score différent de celui du fournisseur (encadré rempli en direct)', () => {
        expect(
            resolveTries(sourced('france-ireland'), [{ ...FRANCE_IRELAND, home_score: 29 }]),
        ).toEqual([{ api_game_id: 1, ok: false, reason: 'score_mismatch' }]);
    });

    it('rejette un décompte qui ne reconstitue pas le score', () => {
        const [{ box }] = sourced('france-ireland');
        const missingTry = { box: { ...box, try2: "[[Nick Timoney|Timoney]] 58' c" }, revid: 42 };
        expect(resolveTries([missingTry], [FRANCE_IRELAND])).toEqual([
            { api_game_id: 1, ok: false, reason: 'checksum_failed' },
        ]);
    });
});
