/** Les quatre volets du guide d'accueil, dans l'ordre d'affichage. */
export type WelcomeStepKey = 'intro' | 'predictions' | 'leagues' | 'notifications';

/**
 * Action proposée au bas d'un volet — seul celui des notifications en porte
 * une. Décrite en donnée (et non en callback) pour que la composition du
 * guide reste un module pur, testable sans rendu.
 */
export type WelcomeStepAction =
    /** Demande la permission notifications à l'OS puis enregistre le token. */
    | 'enable-notifications'
    /** Permission définitivement refusée : seuls les réglages OS peuvent la rendre. */
    | 'open-os-settings';

/**
 * Toutes les actions du guide : celles des volets, plus le double bouton du
 * dernier volet (règles, ligues), placé là pour qu'on lise tout avant de
 * partir ailleurs.
 */
export type WelcomeAction =
    | WelcomeStepAction
    /** Ouvre l'écran des règles (barème complet). */
    | 'rules'
    /** Ouvre l'écran de création / adhésion à une ligue. */
    | 'leagues';

export type WelcomeStep = {
    key: WelcomeStepKey;
    action: WelcomeStepAction | null;
};
