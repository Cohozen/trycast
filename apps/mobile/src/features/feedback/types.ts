/**
 * Écran que regardait le testeur au moment d'ouvrir le signalement, figé à
 * l'ouverture de la sheet (et non à l'envoi, qui peut survenir après une
 * navigation).
 */
export type FeedbackScreen = {
    /** Chemin réel, identifiants compris (`/match/123`). */
    pathname: string;
    /** Segments Expo Router (`['(app)', 'match', '[id]']`). */
    segments: string[];
    /** Paramètres de route bruts, filtrés ensuite par `buildFeedbackContext`. */
    params: Record<string, string | string[] | undefined>;
};

/** Environnement de l'app, joint au rapport pour le rattacher à un binaire et à une OTA. */
export type FeedbackAppInfo = {
    version: string | null;
    build: string | null;
    /** Canal EAS (`preview`, `production`), vide en local. */
    channel: string | null;
    /** Identifiant de la mise à jour à distance chargée, null sur le bundle embarqué. */
    updateId: string | null;
    locale: string;
    theme: 'light' | 'dark';
};

/** Ce que Sentry reçoit en plus du message : étiquettes filtrables et contexte lisible. */
export type FeedbackSentryContext = {
    url: string;
    tags: Record<string, string>;
    context: Record<string, string>;
};
