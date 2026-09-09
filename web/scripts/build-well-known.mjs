// Génère web/public/.well-known/ avant le build Astro.
//
// Ces deux fichiers sont ce qui autorise l'app à revendiquer www.trycast.fr :
// sans eux, un lien https://www.trycast.fr/rejoindre/<code> reste une page web
// et n'ouvre jamais l'app. Ni Apple ni Google ne suivent de redirection pour
// aller les lire — d'où l'hôte primaire, et lui seul.
//
// Ils sont **générés et non versionnés**, sur le même principe que les clés
// Aptabase/Sentry/Google de l'app : sans les valeurs, rien n'est écrit et le
// site se construit quand même. C'est délibéré — une empreinte fausse ou un
// Team ID d'attente serait pire que l'absence de fichier, parce que la
// vérification échouerait alors en silence, sans rien signaler nulle part.
//
//   APPLE_TEAM_ID              identifiant d'équipe Apple Developer (10 car.).
//                              Indisponible tant qu'aucun abonnement n'est pris.
//   ANDROID_CERT_FINGERPRINTS  empreintes SHA-256 séparées par des virgules.
//                              Il en faut **plusieurs** : celle de la clé Play
//                              App Signing, celle de la clé d'importation, et
//                              celle du build de test — n'en déclarer qu'une
//                              fait échouer la vérification chez une partie
//                              seulement des utilisateurs, comme pour les
//                              clients OAuth Android (cf. AGENTS.md).
//
// À renseigner dans les variables d'environnement du projet Vercel.
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const APP_ID = 'com.cohozen.trycast';
/** Seuls les liens d'invitation ouvrent l'app : la landing et les pages
 *  légales doivent continuer de s'ouvrir dans le navigateur. */
const PATH_PREFIX = '/rejoindre';

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', '.well-known');

const teamId = process.env.APPLE_TEAM_ID?.trim();
const fingerprints = (process.env.ANDROID_CERT_FINGERPRINTS ?? '')
    .split(',')
    .map((value) => value.trim().toUpperCase())
    .filter(Boolean);

// Une empreinte mal formée ne casse rien au build et ne se voit nulle part :
// le fichier est servi, Google le lit, la vérification échoue, et les liens
// s'ouvrent dans le navigateur sans le moindre message. On préfère arrêter le
// build. Le cas le plus probable est une SHA-1 (40 caractères) copiée à la
// place d'une SHA-256 — ce sont voisines dans la Play Console, et c'est la
// SHA-1 que réclament les clients OAuth.
const SHA256 = /^[0-9A-F]{2}(:[0-9A-F]{2}){31}$/;
const malformed = fingerprints.filter((value) => !SHA256.test(value));
if (malformed.length > 0) {
    console.error(
        `ANDROID_CERT_FINGERPRINTS : ${malformed.length} empreinte(s) invalide(s).\n` +
            'Attendu : des SHA-256 séparées par des virgules, 32 octets en hexadécimal\n' +
            'séparés par des deux-points (95 caractères). Relever la SHA-256 — et non la\n' +
            "SHA-1 — de chaque certificat dans la Play Console, Intégrité de l'application\n" +
            "→ Signature de l'application.\n" +
            malformed.map((value) => `  ✗ ${value} (${value.length} caractères)`).join('\n'),
    );
    process.exit(1);
}

// Repartir d'un dossier vide : une valeur retirée de l'environnement doit
// retirer le fichier, pas laisser traîner la version précédente.
await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });

const written = [];

if (teamId) {
    // Servi sans extension : le Content-Type application/json est imposé par
    // web/vercel.json, faute de quoi Apple ignore le fichier sans rien dire.
    await writeFile(
        join(outDir, 'apple-app-site-association'),
        `${JSON.stringify(
            {
                applinks: {
                    details: [
                        {
                            appIDs: [`${teamId}.${APP_ID}`],
                            components: [{ '/': `${PATH_PREFIX}/*` }],
                        },
                    ],
                },
            },
            null,
            2,
        )}\n`,
    );
    written.push('apple-app-site-association');
}

if (fingerprints.length > 0) {
    await writeFile(
        join(outDir, 'assetlinks.json'),
        `${JSON.stringify(
            [
                {
                    relation: ['delegate_permission/common.handle_all_urls'],
                    target: {
                        namespace: 'android_app',
                        package_name: APP_ID,
                        sha256_cert_fingerprints: fingerprints,
                    },
                },
            ],
            null,
            2,
        )}\n`,
    );
    written.push(`assetlinks.json (${fingerprints.length} empreinte(s))`);
}

console.log(
    written.length > 0
        ? `.well-known : ${written.join(', ')}`
        : '.well-known : rien à générer (APPLE_TEAM_ID et ANDROID_CERT_FINGERPRINTS absents)',
);
