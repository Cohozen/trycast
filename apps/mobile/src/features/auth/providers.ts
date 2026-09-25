/** Fournisseurs d'identité connus de l'app. */
export type OAuthProviderId = 'google' | 'apple';

/**
 * Miroir de `Platform.OS`. Redéclaré plutôt qu'importé : ce module doit rester
 * pur (les tests unitaires tournent sous Node, où l'index de react-native n'est
 * pas parsable). C'est l'écran qui lit `Platform.OS` et le passe ici.
 */
export type PlatformName = 'ios' | 'android' | 'web' | 'macos' | 'windows';

/**
 * Mécanique d'ouverture de session. Elle dépend du couple fournisseur ×
 * plateforme, pas du fournisseur seul : Apple, par exemple, est natif sur iOS
 * et passe par le navigateur sur Android.
 *
 * - `native-id-token` : feuille de choix de compte native → `id_token` →
 *   `supabase.auth.signInWithIdToken`.
 * - `web-redirect` : navigateur système → retour sur le schéma de l'app →
 *   `supabase.auth.setSession`.
 */
export type OAuthFlow = 'native-id-token' | 'web-redirect';

/** Un fournisseur tel que l'UI le consomme, une fois la plateforme résolue. */
export type OAuthProvider = {
    id: OAuthProviderId;
    flow: OAuthFlow;
    /** Clé i18n du libellé du bouton (namespace auth). */
    labelKey: 'auth:actions.continueWithGoogle' | 'auth:actions.continueWithApple';
};

export type ProviderDefinition = {
    id: OAuthProviderId;
    labelKey: OAuthProvider['labelKey'];
    /** Mécanique par plateforme. Plateforme absente = fournisseur non proposé. */
    flows: Partial<Record<PlatformName, OAuthFlow>>;
    /**
     * Le jeton du fournisseur doit être révoqué à la suppression du compte
     * (règle 5.1.1(v) de l'App Store pour Apple) : l'app redemande une
     * connexion au fournisseur juste avant de supprimer.
     */
    revokeOnDeletion?: true;
};

/**
 * Ajouter un fournisseur se fait **ici et nulle part ailleurs** : les écrans
 * itèrent sur `resolveProviders()` et ne nomment aucun fournisseur.
 *
 * Apple en premier : les règles de l'App Store ne le veulent pas moins en vue
 * que les autres. iOS seulement — sur Android, le flux navigateur exigerait un
 * Services ID et une clé secrète à renouveler tous les six mois.
 */
const DEFINITIONS: ProviderDefinition[] = [
    {
        id: 'apple',
        labelKey: 'auth:actions.continueWithApple',
        flows: { ios: 'native-id-token' },
        revokeOnDeletion: true,
    },
    {
        id: 'google',
        labelKey: 'auth:actions.continueWithGoogle',
        flows: { android: 'native-id-token', ios: 'native-id-token' },
    },
];

// Lecture littérale obligatoire : Expo remplace `process.env.EXPO_PUBLIC_*` à la
// compilation, un accès dynamique `process.env[nom]` ne serait pas substitué.
const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;

/**
 * Un fournisseur sans identifiants configurés n'est pas proposé — l'app reste
 * utilisable en e-mail + mot de passe. C'est ce qui permet à la CI et à un clone
 * frais de tourner sans configuration, comme pour les clés Aptabase/Sentry.
 *
 * Sur iOS le jeton d'identité est émis pour le client iOS, sur Android pour le
 * client web : les deux exigences diffèrent réellement.
 */
export function isProviderConfigured(id: OAuthProviderId, platform: PlatformName): boolean {
    switch (id) {
        case 'google':
            return platform === 'ios'
                ? Boolean(GOOGLE_WEB_CLIENT_ID && GOOGLE_IOS_CLIENT_ID)
                : Boolean(GOOGLE_WEB_CLIENT_ID);
        case 'apple':
            // Aucun identifiant à fournir : le jeton est émis pour le bundle ID.
            return platform === 'ios';
    }
}

/**
 * Fournisseurs à afficher, pour la plateforme donnée. Les deux derniers
 * paramètres n'existent que pour les tests : en production, la liste réelle et
 * la lecture des variables d'environnement s'appliquent.
 */
export function resolveProviders(
    platform: PlatformName,
    definitions: ProviderDefinition[] = DEFINITIONS,
    isConfigured: (id: OAuthProviderId, platform: PlatformName) => boolean = isProviderConfigured,
): OAuthProvider[] {
    return definitions.flatMap((definition) => {
        const flow = definition.flows[platform];
        if (!flow || !isConfigured(definition.id, platform)) {
            return [];
        }
        return [{ id: definition.id, flow, labelKey: definition.labelKey }];
    });
}

/** Fournisseurs du compte dont le jeton est à révoquer avant sa suppression. */
export function providersToRevoke(
    methods: readonly string[],
    definitions: ProviderDefinition[] = DEFINITIONS,
): OAuthProviderId[] {
    return definitions
        .filter((definition) => definition.revokeOnDeletion && methods.includes(definition.id))
        .map((definition) => definition.id);
}
