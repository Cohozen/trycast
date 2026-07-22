/**
 * Catalogue des événements de mesure d'usage.
 *
 * C'est la **garantie structurelle** qu'aucune donnée personnelle ne part vers
 * Aptabase : chaque événement déclare exactement les propriétés qu'il accepte,
 * et toutes sont des booléens ou des littéraux fermés. Passer un identifiant,
 * un pseudo ou une adresse e-mail devient une erreur de compilation — pas une
 * relecture de code à ne pas oublier.
 *
 * Aptabase est de toute façon anonyme par construction (aucun identifiant
 * d'appareil, sel rotatif quotidien) ; ce catalogue interdit de contourner
 * cette propriété par la porte des propriétés d'événement.
 *
 * Ajouter un événement = ajouter une entrée ici, puis l'appeler via
 * `trackEvent` de `@/lib/analytics`. Voir `docs/rgpd/registre-des-traitements.md`
 * (traitement « mesure d'audience ») avant d'en ajouter un qui sortirait de ce
 * cadre.
 */

export type AnalyticsEvent =
    /** Un compte vient d'être créé (signup accepté par Supabase). */
    | { name: 'account_created' }
    /** Connexion réussie sur un compte existant. */
    | { name: 'signed_in' }
    /** Un pronostic a été enregistré. `first` distingue la création d'une correction. */
    | { name: 'prediction_saved'; props: { first: boolean } }
    /** Une ligue a été créée. */
    | { name: 'league_created' }
    /** Une ligue a été rejointe via un code d'invitation. */
    | { name: 'league_joined' }
    /** Un classement a été consulté, par ligue ou général. */
    | { name: 'leaderboard_viewed'; props: { scope: 'league' | 'global' } }
    /** Les notifications push viennent d'être activées. */
    | { name: 'notifications_enabled' }
    /** Un export de données personnelles a été demandé (RGPD). */
    | { name: 'data_exported' }
    /** Un compte a été supprimé. */
    | { name: 'account_deleted' };

export type AnalyticsEventName = AnalyticsEvent['name'];

/**
 * Propriétés à transmettre au SDK. Aptabase n'accepte que des chaînes et des
 * nombres : les booléens sont convertis ici plutôt que dans chaque appelant.
 */
export function toAptabaseProps(event: AnalyticsEvent): Record<string, string | number> | undefined {
    if (!('props' in event)) return undefined;

    return Object.fromEntries(
        Object.entries(event.props).map(([key, value]) => [
            key,
            typeof value === 'boolean' ? String(value) : value,
        ]),
    );
}
