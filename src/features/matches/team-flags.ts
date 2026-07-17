/**
 * Drapeaux nationaux simplifiés du Nations Championship, dessinés dans le
 * viewBox 108×96 du ballon-comète (`TeamFlag`). Les formes restent droites à
 * l'écran : c'est le clip (l'ellipse rotée du ballon) qui donne la silhouette
 * de l'icône, elles débordent donc volontairement de la zone visible.
 * Hex en dur = exception DS documentée : couleurs officielles des drapeaux,
 * hors palette TryCast (même statut que la map FLAGS de la maquette DS).
 */

export type FlagShape =
    | { kind: 'rect'; x: number; y: number; width: number; height: number; fill: string }
    | { kind: 'circle'; cx: number; cy: number; r: number; fill: string }
    | { kind: 'polygon'; points: string; fill: string }
    | { kind: 'path'; d: string; fill: string };

export type FlagDef = {
    /** Couleur de la traînée du ballon (représentative du drapeau, jamais blanche). */
    primary: string;
    /** Formes empilées dans l'ordre de dessin, clippées par l'ellipse du ballon. */
    shapes: FlagShape[];
};

// Zone de dessin généreuse autour de l'ellipse (croppée par le clip)
const X0 = 12;
const Y0 = 10;
const W = 92;
const H = 80;

const WHITE = '#FFFFFF';
const NAVY = '#012169';
const UJ_RED = '#C8102E';

function round(value: number): number {
    return Math.round(value * 10) / 10;
}

function field(fill: string): FlagShape {
    return { kind: 'rect', x: X0, y: Y0, width: W, height: H, fill };
}

function verticalBands(colors: string[]): FlagShape[] {
    const width = W / colors.length;
    return colors.map((fill, i) => ({
        kind: 'rect',
        x: round(X0 + i * width),
        y: Y0,
        width: round(width + 0.5),
        height: H,
        fill,
    }));
}

function horizontalBands(colors: string[]): FlagShape[] {
    const height = H / colors.length;
    return colors.map((fill, i) => ({
        kind: 'rect',
        x: X0,
        y: round(Y0 + i * height),
        width: W,
        height: round(height + 0.5),
        fill,
    }));
}

/** Bande diagonale (rectangle roté) d'axe (x1,y1)→(x2,y2). */
function diagonalStripe(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    halfWidth: number,
    fill: string,
): FlagShape {
    const length = Math.hypot(x2 - x1, y2 - y1);
    const nx = (-(y2 - y1) / length) * halfWidth;
    const ny = ((x2 - x1) / length) * halfWidth;
    const pt = (x: number, y: number) => `${round(x)},${round(y)}`;
    return {
        kind: 'polygon',
        points: [
            pt(x1 + nx, y1 + ny),
            pt(x2 + nx, y2 + ny),
            pt(x2 - nx, y2 - ny),
            pt(x1 - nx, y1 - ny),
        ].join(' '),
        fill,
    };
}

/** Sommets d'une étoile (pointe en haut), rayons externe/interne alternés. */
export function starPoints(
    cx: number,
    cy: number,
    outerRadius: number,
    innerRadius: number,
    branches = 5,
): string {
    const coords: string[] = [];
    for (let i = 0; i < branches * 2; i += 1) {
        const radius = i % 2 === 0 ? outerRadius : innerRadius;
        const angle = -Math.PI / 2 + (i * Math.PI) / branches;
        coords.push(
            `${round(cx + radius * Math.cos(angle))},${round(cy + radius * Math.sin(angle))}`,
        );
    }
    return coords.join(' ');
}

function star(cx: number, cy: number, outerRadius: number, fill: string): FlagShape {
    return { kind: 'polygon', points: starPoints(cx, cy, outerRadius, outerRadius * 0.45), fill };
}

/** Étoile bordée (étoile de fond légèrement plus grande + étoile colorée). */
function borderedStar(
    cx: number,
    cy: number,
    outerRadius: number,
    fill: string,
    border: string,
): FlagShape[] {
    return [star(cx, cy, outerRadius + 1.2, border), star(cx, cy, outerRadius, fill)];
}

/** Canton Union Jack simplifié (quart haut-gauche du drapeau) pour NZL/AUS/FIJ. */
function unionJackCanton(): FlagShape[] {
    return [
        { kind: 'rect', x: 12, y: 10, width: 46, height: 40, fill: NAVY },
        diagonalStripe(12, 10, 58, 50, 2.6, WHITE),
        diagonalStripe(12, 50, 58, 10, 2.6, WHITE),
        { kind: 'rect', x: 31, y: 10, width: 8, height: 40, fill: WHITE },
        { kind: 'rect', x: 12, y: 26, width: 46, height: 8, fill: WHITE },
        { kind: 'rect', x: 32.75, y: 10, width: 4.5, height: 40, fill: UJ_RED },
        { kind: 'rect', x: 12, y: 27.75, width: 46, height: 4.5, fill: UJ_RED },
    ];
}

// Croix du Sud, placée dans la partie droite (relevée) de l'ellipse
const SOUTHERN_CROSS: readonly (readonly [number, number])[] = [
    [77, 31],
    [79, 47],
    [70, 40],
    [85, 38],
];

/**
 * Drapeaux keyés par tricode (`teams.code`). Les 12 nations du Nations
 * Championship ; toute autre équipe garde le repli ballon uni + tricode.
 */
export const FLAG_DEFS: Record<string, FlagDef> = {
    FRA: { primary: '#2C5697', shapes: verticalBands(['#2C5697', WHITE, '#E1000F']) },
    IRL: { primary: '#169B62', shapes: verticalBands(['#169B62', WHITE, '#FF883E']) },
    ITA: { primary: '#009246', shapes: verticalBands(['#009246', WHITE, '#CE2B37']) },
    ARG: { primary: '#74ACDF', shapes: horizontalBands(['#74ACDF', WHITE, '#74ACDF']) },
    JPN: {
        primary: '#BC002D',
        shapes: [field(WHITE), { kind: 'circle', cx: 58, cy: 50, r: 12, fill: '#BC002D' }],
    },
    ENG: {
        primary: UJ_RED,
        shapes: [
            field(WHITE),
            { kind: 'rect', x: 51, y: 10, width: 14, height: 80, fill: UJ_RED },
            { kind: 'rect', x: 12, y: 43, width: 92, height: 14, fill: UJ_RED },
        ],
    },
    SCO: {
        primary: '#005EB8',
        shapes: [
            field('#005EB8'),
            diagonalStripe(8, 2, 108, 94, 7, WHITE),
            diagonalStripe(8, 98, 108, 6, 7, WHITE),
        ],
    },
    WAL: {
        primary: '#D30731',
        shapes: [
            { kind: 'rect', x: X0, y: Y0, width: W, height: 40, fill: WHITE },
            { kind: 'rect', x: X0, y: 50, width: W, height: 40, fill: '#00B140' },
            // Dragon silhouette très simplifié (ailes crénelées, queue fléchée)
            {
                kind: 'path',
                d: 'M40 46 L46 43 L47 39 L50 43 L55 40 L57 45 L62 40 L63 46 L72 46 L76 42 L78 46 L74 50 L66 52 L64 57 L60 56 L60 52 L52 52 L51 57 L47 56 L48 51 L43 49 Z',
                fill: '#D30731',
            },
        ],
    },
    NZL: {
        primary: NAVY,
        shapes: [
            field(NAVY),
            ...unionJackCanton(),
            ...SOUTHERN_CROSS.flatMap(([cx, cy]) => borderedStar(cx, cy, 3.4, UJ_RED, WHITE)),
        ],
    },
    AUS: {
        primary: NAVY,
        shapes: [
            field(NAVY),
            ...unionJackCanton(),
            // Étoile du Commonwealth sous le canton
            star(38, 57, 4.6, WHITE),
            ...SOUTHERN_CROSS.map(([cx, cy]) => star(cx, cy, 3.8, WHITE)),
        ],
    },
    RSA: {
        primary: '#007749',
        shapes: [
            { kind: 'rect', x: X0, y: Y0, width: W, height: 40, fill: '#E03C31' },
            { kind: 'rect', x: X0, y: 50, width: W, height: 40, fill: '#001489' },
            { kind: 'rect', x: X0, y: 40, width: W, height: 20, fill: WHITE },
            { kind: 'rect', x: X0, y: 44, width: W, height: 12, fill: '#007749' },
            { kind: 'polygon', points: '12,26 46,50 12,74', fill: '#FFB81C' },
            { kind: 'polygon', points: '12,32 38,50 12,68', fill: '#000000' },
        ],
    },
    FIJ: { primary: '#68BFE5', shapes: [field('#68BFE5'), ...unionJackCanton()] },
};
