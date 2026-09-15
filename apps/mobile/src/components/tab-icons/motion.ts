/**
 * Chorégraphie des icônes de la barre d'onglets.
 *
 * Chaque onglet porte UNE frise (`timeline`) menée linéairement de 0 à 1 en
 * TAB_ICON_MOTION_DURATION ms quand il devient actif ; chaque trait en dérive
 * son propre mouvement via une fenêtre [start, end]. Le décalage en cascade
 * est donc gratuit, et le retour à la géométrie Lucide est garanti par
 * construction (hors fenêtre, le déplacement vaut exactement 0).
 *
 * REPOS = 1, pas 0 : c'est ce qui rend l'état d'arrivée identique à l'état de
 * départ, y compris pour la coche de « Résultats », dont l'animation est un
 * tracé monotone et non un aller-retour (à 0 elle serait invisible).
 *
 * Les easings vivent ici et non dans le `withTiming` : c'est ce qui permet à
 * des impulsions et à une rampe monotone de partager la même frise linéaire.
 *
 * Module PUR (aucun import react-native) : testé en Vitest. La directive
 * 'worklet' est une simple expression-chaîne — traitée par le plugin Babel de
 * react-native-worklets dans l'app, ignorée par esbuild sous Vitest.
 */

/** Durée totale de la frise d'activation d'un onglet, en millisecondes. */
export const TAB_ICON_MOTION_DURATION = 600;

/** Sommet de l'impulsion dans sa fenêtre : montée courte, retour plus long. */
const PULSE_PEAK = 0.42;

function easeOutCubic(u: number): number {
    'worklet';
    const v = 1 - u;
    return 1 - v * v * v;
}

function easeInOutCubic(u: number): number {
    'worklet';
    return u < 0.5 ? 4 * u * u * u : 1 - (-2 * u + 2) ** 3 / 2;
}

/**
 * Impulsion aller-retour sur [start, end] : 0 → 1 → 0, dérivée nulle aux deux
 * bouts (pas de rebond, conforme au ton du DS). Vaut EXACTEMENT 0 en dehors de
 * la fenêtre — c'est le contrat qui garantit le retour à l'état initial.
 */
export function pulse(t: number, start: number, end: number): number {
    'worklet';
    if (t <= start || t >= end) return 0;
    const p = (t - start) / (end - start);
    if (p <= PULSE_PEAK) return easeOutCubic(p / PULSE_PEAK);
    return 1 - easeInOutCubic((p - PULSE_PEAK) / (1 - PULSE_PEAK));
}

/** Rampe monotone 0 → 1 (ease-out), figée à 1 au-delà de `end`. */
export function rise(t: number, start: number, end: number): number {
    'worklet';
    if (t <= start) return 0;
    if (t >= end) return 1;
    return easeOutCubic((t - start) / (end - start));
}

/* ---- Mes matchs (« list ») : 3 rangées puce + trait, en cascade ---- */

export const LIST_ROWS = [
    { y: 5, start: 0, end: 0.72 },
    { y: 12, start: 0.14, end: 0.86 },
    { y: 19, start: 0.28, end: 1 },
] as const;

/**
 * Glissé horizontal d'une rangée, en unités de viewBox. PLAFOND DUR : le bout
 * du trait (x = 21) plus ce décalage plus le demi-cap rond (1,2 au strokeWidth
 * le plus épais) doit rester dans le viewBox de 24, sinon la couche active est
 * rognée par le bord. Verrouillé par motion.test.ts.
 */
export const LIST_SHIFT = 1.6;

/* ---- Résultats (« circle-check-big ») : la coche se retrace ---- */

export const CHECK_WINDOW = { start: 0.03, end: 0.63 } as const;

/** Longueur exacte de « m9 11 3 3L22 4 » : 3√2 (montée) + 10√2 (branche longue). */
export const CHECK_PATH_LENGTH = 13 * Math.SQRT2;

/**
 * Motif de tirets de la coche. Une unité de marge au-delà de la longueur du
 * tracé : à offset maximal, le cap rond ne laisse pas de point résiduel.
 */
export const CHECK_DASH = CHECK_PATH_LENGTH + 1;

/* ---- Classement (« chart-column ») : les barres se tassent puis repoussent ---- */

/** Ligne de base des trois barres : leur pied ne bouge jamais. */
export const CHART_BASELINE = 17;

/** Ordre de gauche à droite (et non l'ordre de déclaration de Lucide) : sens de lecture. */
export const CHART_BARS = [
    { x: 8, top: 14, start: 0, end: 0.7 },
    { x: 13, top: 5, start: 0.15, end: 0.85 },
    { x: 18, top: 9, start: 0.3, end: 1 },
] as const;

/** Écrasement d'une barre : 40 % de sa hauteur, plafonné à 3 unités. */
export function barShrink(top: number): number {
    'worklet';
    return Math.min(3, 0.4 * (CHART_BASELINE - top));
}

/* ---- Profil (« user ») : hochement de tête ---- */

export const HEAD_WINDOW = { start: 0.05, end: 0.75 } as const;

/** Amplitude du hochement, en unités de viewBox. */
export const HEAD_NOD = 1.1;
