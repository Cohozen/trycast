import type { FeedbackAppInfo, FeedbackScreen, FeedbackSentryContext } from './types';

/**
 * Paramètres de route joints au rapport : des identifiants techniques
 * (match, ligue, joueur) et l'onglet ouvert, rien de saisi par
 * l'utilisateur. **Liste blanche, jamais liste noire** : le code
 * d'invitation (`/league/new?code=…`) donne accès à une ligue, et un
 * paramètre ajouté demain ne doit pas partir chez Sentry sans décision.
 */
const FORWARDED_PARAMS = ['id', 'tab'] as const;

/**
 * Motif de l'écran, sans les groupes Expo Router : `match/[id]` plutôt que
 * `/match/123`. C'est l'étiquette filtrable côté Sentry — à faible
 * cardinalité, là où le chemin réel ferait une valeur par match.
 */
export function screenPattern(segments: string[]): string {
    const visible = segments.filter((segment) => !/^\(.*\)$/.test(segment));
    return visible.length > 0 ? visible.join('/') : 'index';
}

function firstValue(value: string | string[] | undefined): string | undefined {
    return Array.isArray(value) ? value[0] : value;
}

export function buildFeedbackContext(
    screen: FeedbackScreen,
    app: FeedbackAppInfo,
): FeedbackSentryContext {
    const params: Record<string, string> = {};
    for (const key of FORWARDED_PARAMS) {
        const value = firstValue(screen.params[key]);
        if (value) params[`param.${key}`] = value;
    }

    const tags: Record<string, string> = {
        screen: screenPattern(screen.segments),
        locale: app.locale,
        theme: app.theme,
    };
    if (app.channel) tags.channel = app.channel;

    const context: Record<string, string> = { pathname: screen.pathname, ...params };
    if (app.version) context.version = app.version;
    if (app.build) context.build = app.build;
    if (app.updateId) context.updateId = app.updateId;

    return { url: screen.pathname, tags, context };
}
