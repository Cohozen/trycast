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

/**
 * Moyen de connexion. Littéraux fermés : le fournisseur, jamais l'identité.
 * `'apple'` est déclaré d'avance pour que brancher Sign in with Apple ne
 * demande pas de toucher au catalogue.
 */
export type SignInMethod = 'password' | 'google' | 'apple';

type SignInMethodProp = { method: SignInMethod };

export type AnalyticsEvent =
    /**
     * Un compte vient d'être créé. Émis au moment où le compte devient
     * utilisable : signup accepté pour le parcours e-mail, choix du pseudo pour
     * un parcours OAuth (avant, le compte existe mais n'a pas d'identité dans
     * l'app).
     */
    | { name: 'account_created'; props: SignInMethodProp }
    /** Connexion réussie sur un compte existant. */
    | { name: 'signed_in'; props: SignInMethodProp }
    /** Un pronostic a été enregistré. `first` distingue la création d'une correction. */
    | { name: 'prediction_saved'; props: { first: boolean } }
    /**
     * Le joker d'une phase a bougé : posé (`set`), déplacé d'un match à un
     * autre (`moved`) ou retiré (`cleared`). Jamais le match ni la phase.
     */
    | { name: 'joker_changed'; props: { action: 'set' | 'moved' | 'cleared' } }
    /** Une ligue a été créée. */
    | { name: 'league_created' }
    /**
     * Une ligue a été rejointe. `via` distingue le code saisi ou collé à la
     * main d'une arrivée par lien d'invitation, pour mesurer ce que le partage
     * par lien apporte réellement.
     */
    | { name: 'league_joined'; props: { via: 'code' | 'link' } }
    /**
     * Une invitation vient d'être partagée. `from` situe le point de départ —
     * l'écran de succès juste après la création, ou les réglages d'une ligue
     * existante. Jamais le code lui-même : ce serait un identifiant.
     */
    | { name: 'league_invite_shared'; props: { from: 'creation' | 'settings' } }
    /** Un classement a été consulté. Même vocabulaire que l'écran Classement. */
    | { name: 'leaderboard_viewed'; props: { scope: 'leagues' | 'global' } }
    /** Les notifications push viennent d'être activées. */
    | { name: 'notifications_enabled' }
    /** Un export de données personnelles a été demandé (RGPD). */
    | { name: 'data_exported' }
    /** Un compte a été supprimé. */
    | { name: 'account_deleted' }
    /**
     * Le guide d'accueil a été fermé. `completed` distingue « suivi jusqu'au
     * bout » (ou sorti par un de ses boutons) de « passé / glissé ».
     */
    | { name: 'welcome_guide_closed'; props: { completed: boolean } };

export type AnalyticsEventName = AnalyticsEvent['name'];

/**
 * Propriétés à transmettre au SDK. Aptabase n'accepte que des chaînes et des
 * nombres : les booléens sont convertis ici plutôt que dans chaque appelant.
 */
export function toAptabaseProps(
    event: AnalyticsEvent,
): Record<string, string | number> | undefined {
    if (!('props' in event)) return undefined;

    return Object.fromEntries(
        Object.entries(event.props).map(([key, value]) => [
            key,
            typeof value === 'boolean' ? String(value) : value,
        ]),
    );
}
