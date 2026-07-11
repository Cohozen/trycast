// Config dynamique par-dessus app.json : uniquement ce qui dépend de
// l'environnement. google-services.json (identifiants du projet Firebase)
// n'est pas versionné — en build EAS il arrive via l'env var fichier
// GOOGLE_SERVICES_JSON, en local via le fichier gitignoré à la racine.
import type { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
    ...config,
    name: config.name ?? 'trycast',
    slug: config.slug ?? 'trycast',
    android: {
        ...config.android,
        googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? './google-services.json',
    },
});
