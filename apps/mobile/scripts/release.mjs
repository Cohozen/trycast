#!/usr/bin/env node
/**
 * Prépare une release : bump de version, journal, vérifications, commit et tag.
 *
 *   npm run release -- --patch --notes "Corrige le décompte du rappel"
 *   npm run release -- --minor --notes "Partage d'une ligue par lien"
 *   npm run release -- --version=1.2.0 --notes "…" --dry-run
 *
 * Pourquoi un script : une release, c'est six gestes qui doivent tomber
 * ensemble — deux fichiers de version qui ne doivent jamais diverger
 * (`src/lib/app-version.test.ts` casse la CI sinon), un journal, les quatre
 * vérifications de la CI, un commit, un tag. En faire cinq sur six produit un
 * état qu'on ne découvre qu'au build suivant. Ici, soit tout passe, soit
 * l'arbre est rendu tel qu'il était.
 *
 * Ce script ne pousse rien, ne lance aucun build, ne publie aucune mise à jour.
 * Il affiche les commandes suivantes — c'est à Corentin de les jouer.
 *
 * ⚠️ Le piège du projet : `runtimeVersion.policy = "fingerprint"`. Une mise à
 * jour à distance n'est délivrée qu'aux builds de MÊME empreinte, et le
 * non-appariement est MUET — aucune erreur, le correctif n'arrive jamais.
 * L'étape « empreinte » compare l'empreinte locale à celle du dernier build de
 * production et annonce laquelle des deux sorties s'applique. Elle est réseau
 * et suppose une session EAS : elle AVERTIT, elle ne bloque jamais.
 *
 * ⚠️ Second piège, invisible : `expo.version` fait partie de l'empreinte tant
 * que `fingerprint.config.js` n'exclut pas `ExpoConfigVersions` (vérifié dans
 * `@expo/fingerprint/build/sourcer/Expo.js` : la version n'est retirée que sous
 * ce drapeau, et la source `expoConfig` hachée contient bien `"version"`).
 * Dans ce régime — celui du projet aujourd'hui — **tout bump impose un build**,
 * et aucune version bumpée ne peut partir en OTA. Le script détecte le régime
 * et le dit, plutôt que de conclure à tort qu'une mise à jour suffirait.
 *
 * `--skip-checks` saute les quatre vérifications, `--skip-fingerprint` la
 * comparaison d'empreinte, `--dry-run` affiche tout sans rien écrire.
 */

import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..');
const APP_JSON = join(RACINE, 'app.json');
const PACKAGE_JSON = join(RACINE, 'package.json');
const CHANGELOG = join(RACINE, 'CHANGELOG.md');

const SEMVER = /^\d+\.\d+\.\d+$/;
const EMPREINTE = /^[0-9a-f]{40}$/;

/** Plafond du champ « Nouveautés de cette version » de la Play Console. */
const PLAFOND_PLAY = 500;

const EN_TETE_CHANGELOG = `# Journal des modifications

Les versions distribuées de TryCast, la plus récente en tête. Le numéro suit le
semver (MAJEUR.MINEUR.CORRECTIF) et reflète \`app.json\` → \`expo.version\`.

Le numéro de build (\`versionCode\`) n'apparaît pas ici : il est attribué par EAS
à chaque build de production, et n'est jamais écrit dans le dépôt.

Écrit par \`npm run release\`, à partir des \`--notes\` passées à la commande.
`;

/**
 * Ordre d'affichage des familles de commits. Sur ce dépôt, `docs` représente à
 * lui seul deux commits sur cinq : présenter la liste brute noierait ce qui
 * intéresse au moment d'écrire des notes de version.
 */
const FAMILLES = [
    'feat',
    'fix',
    'perf',
    'refactor',
    'style',
    'test',
    'build',
    'ci',
    'chore',
    'docs',
    'autres',
];

// --- utilitaires ----------------------------------------------------------

const run = (cmd, args) => spawnSync(cmd, args, { stdio: 'inherit', encoding: 'utf8' });
const lire = (cmd, args, options) =>
    execFileSync(cmd, args, {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
        ...options,
    }).trim();
const lireOuNull = (cmd, args, options) => {
    try {
        return lire(cmd, args, options);
    } catch {
        return null;
    }
};
const echouer = (message) => {
    console.error(message);
    process.exit(1);
};

// --- fonctions pures (testées dans release.test.mjs) ----------------------

/** Toutes les occurrences de `--notes` ; une valeur multiligne donne une puce par ligne. */
export function lireNotes(argv) {
    const notes = [];
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        let valeur;
        if (a.startsWith('--notes=')) valeur = a.slice('--notes='.length);
        else if (a === '--notes') valeur = argv[i + 1];
        else continue;
        // Une valeur absente ou commençant par `--` est un drapeau collé par
        // erreur (`--notes --dry-run`), pas une note.
        if (!valeur || valeur.startsWith('--')) continue;
        for (const ligne of valeur.split('\n')) {
            const propre = ligne.trim().replace(/^[-*]\s+/, '');
            if (propre) notes.push(propre);
        }
    }
    return notes;
}

export function incrementer(version, type) {
    if (!SEMVER.test(version)) throw new Error(`Version illisible : ${version}`);
    const [majeur, mineur, correctif] = version.split('.').map(Number);
    if (type === 'major') return `${majeur + 1}.0.0`;
    if (type === 'minor') return `${majeur}.${mineur + 1}.0`;
    if (type === 'patch') return `${majeur}.${mineur}.${correctif + 1}`;
    throw new Error(`Type de bump inconnu : ${type}`);
}

export function comparerVersions(a, b) {
    const ga = a.split('.').map(Number);
    const gb = b.split('.').map(Number);
    for (let i = 0; i < 3; i++) {
        if (ga[i] > gb[i]) return 1;
        if (ga[i] < gb[i]) return -1;
    }
    return 0;
}

/**
 * Version cible à partir des drapeaux. Lève si l'appel est ambigu ou si la
 * cible recule : une version publiée ne redescend pas, la Play Console refuse
 * un `versionName` déjà distribué.
 */
export function resoudreCible(actuelle, argv) {
    const types = ['patch', 'minor', 'major'].filter((t) => argv.includes(`--${t}`));
    const explicite = argv.find((a) => a.startsWith('--version='))?.slice('--version='.length);

    if (types.length + (explicite ? 1 : 0) !== 1) {
        throw new Error(
            '✗ Type de bump manquant ou ambigu.\n' +
                '  Attendu exactement un parmi : --patch, --minor, --major, --version=X.Y.Z\n' +
                `  Version actuelle : ${actuelle}\n` +
                `    npm run release -- --patch  →  ${incrementer(actuelle, 'patch')}\n` +
                `    npm run release -- --minor  →  ${incrementer(actuelle, 'minor')}\n` +
                `    npm run release -- --major  →  ${incrementer(actuelle, 'major')}`,
        );
    }

    const cible = explicite ?? incrementer(actuelle, types[0]);
    if (!SEMVER.test(cible)) {
        throw new Error(
            `✗ « ${cible} » n'est pas un semver MAJEUR.MINEUR.CORRECTIF.\n` +
                '  Les pré-versions ne sont pas gérées : src/lib/app-version.test.ts impose\n' +
                '  les trois nombres, et les stores ne savent pas les ordonner.',
        );
    }
    if (comparerVersions(cible, actuelle) < 0) {
        throw new Error(
            `✗ ${cible} est antérieure à la version actuelle (${actuelle}).\n` +
                '  Une version publiée ne recule pas : la Play Console refuse un versionName\n' +
                '  déjà distribué, et le journal deviendrait illisible.',
        );
    }
    return { type: explicite ? 'version' : types[0], cible };
}

/**
 * Remplace l'unique `"version": "<actuelle>"` d'un fichier JSON, textuellement.
 *
 * Surtout pas `JSON.stringify` : biome replie les tableaux courts sous sa
 * `lineWidth` de 100 (`"associatedDomains": ["applinks:www.trycast.fr"]` tient
 * sur une ligne) et `app.json` stocke ses accents échappés (`è`). Un
 * reparse/restringify déplierait les uns et décoderait les autres : format:check
 * rouge sur le commit de release, et un diff de cinquante lignes là où trois
 * suffisent.
 */
export function remplacerVersion(contenu, actuelle, cible, libelle) {
    const motif = new RegExp(`"version": "${actuelle.replace(/\./g, '\\.')}"`, 'g');
    const occurrences = (contenu.match(motif) || []).length;
    if (occurrences !== 1) {
        throw new Error(
            `✗ ${libelle} : "version": "${actuelle}" apparaît ${occurrences} fois, pas une.\n` +
                "  Le script ne réécrit qu'une occurrence certaine ; il ne devine pas.\n" +
                '  Corrige le fichier à la main, ou le motif dans scripts/release.mjs.',
        );
    }
    return contenu.replace(motif, `"version": "${cible}"`);
}

export function sectionChangelog(cible, notes, date) {
    return `## ${cible} — ${date}\n\n${notes.map((n) => `- ${n}`).join('\n')}\n`;
}

/**
 * Insère la section en tête du journal, juste après l'en-tête. Le script
 * n'ajoute jamais qu'en tête : il ne relit ni ne réécrit les sections passées.
 */
export function changelogAvecSection(actuel, section) {
    if (actuel === null) return `${EN_TETE_CHANGELOG}\n${section}`;
    const debut = actuel.indexOf('\n## ');
    if (debut === -1) return `${actuel.trimEnd()}\n\n${section.trim()}\n`;
    const tete = actuel.slice(0, debut);
    const reste = actuel.slice(debut + 1);
    return `${tete.trimEnd()}\n\n${section.trim()}\n\n${reste.trimStart()}`;
}

/**
 * Corps d'une section du journal, titre exclu — ce que la GitHub Release
 * affiche sous son propre titre. `null` si la version n'y figure pas.
 *
 * Le workflow de release s'en sert plutôt que d'un `awk` dans le YAML : le
 * format du journal appartient à ce fichier, et une extraction non testée dans
 * un script de CI ne se découvre cassée que le jour d'une release.
 */
export function extraireSection(contenu, version) {
    const echappe = version.replace(/\./g, '\\.');
    const debut = contenu.match(new RegExp(`^## ${echappe}(\\s|$).*$`, 'm'));
    if (!debut) return null;
    const apres = contenu.slice(debut.index + debut[0].length);
    const suivante = apres.search(/^## /m);
    return (suivante === -1 ? apres : apres.slice(0, suivante)).trim();
}

/** Range des sujets de commit par préfixe conventionnel. */
export function grouperCommits(sujets) {
    const groupes = new Map();
    for (const sujet of sujets) {
        const prefixe = sujet.match(/^([a-z]+)(\([^)]*\))?!?:\s/)?.[1];
        const famille = FAMILLES.includes(prefixe) ? prefixe : 'autres';
        if (!groupes.has(famille)) groupes.set(famille, []);
        groupes.get(famille).push(sujet.replace(/^[a-z]+(\([^)]*\))?!?:\s*/, ''));
    }
    return groupes;
}

// --- lectures du dépôt ----------------------------------------------------

function versionsActuelles() {
    const appTexte = readFileSync(APP_JSON, 'utf8');
    const pkgTexte = readFileSync(PACKAGE_JSON, 'utf8');
    const app = JSON.parse(appTexte).expo?.version;
    const pkg = JSON.parse(pkgTexte).version;
    if (app !== pkg) {
        echouer(
            `✗ app.json (${app}) et package.json (${pkg}) ne portent pas la même version.\n` +
                '  Cette dérive casse déjà src/lib/app-version.test.ts. Aligne les deux à la\n' +
                '  main et commite, puis relance : le commit de release ne doit contenir que\n' +
                '  le bump et le journal.',
        );
    }
    if (!SEMVER.test(app)) echouer(`✗ Version illisible dans app.json : ${app}`);
    return { actuelle: app, appTexte, pkgTexte };
}

function gardesDepot(cible) {
    const branche = lireOuNull('git', ['rev-parse', '--abbrev-ref', 'HEAD']);
    if (branche !== 'main') {
        echouer(
            branche === 'HEAD'
                ? '✗ HEAD est détaché : place-toi sur main pour taguer une release.'
                : `✗ Release depuis « ${branche} », pas depuis main.\n` +
                      '  Un tag de release doit être joignable depuis main, sinon\n' +
                      '  `git describe` ne le retrouvera plus au passage suivant.',
        );
    }

    const sale = lireOuNull('git', ['status', '--porcelain']);
    if (sale) {
        echouer(
            '✗ Arbre de travail non propre. Le commit de release ne doit contenir que\n' +
                '  le bump de version et le journal — pas du code de passage.\n\n' +
                `${sale}\n\n` +
                '  Commite ou remise ce qui traîne, puis relance.',
        );
    }

    const tag = `v${cible}`;
    if (lireOuNull('git', ['tag', '--list', tag])) {
        const ou = lireOuNull('git', ['log', '-1', '--format=%h, %ad', '--date=short', tag]);
        echouer(
            `✗ Le tag ${tag} existe déjà${ou ? ` (${ou})` : ''}.\n` +
                '  Choisis la version suivante, ou supprime le tag si la release a avorté :\n' +
                `      git tag -d ${tag}`,
        );
    }

    // Sans `fetch` : on lit ce que la machine sait déjà, pour ne pas transformer
    // une préparation de release en accès réseau silencieux.
    const retard = lireOuNull('git', ['rev-list', '--count', 'HEAD..@{u}']);
    if (retard && retard !== '0') {
        console.warn(
            `⚠️  origin/main a ${retard} commit(s) que tu n'as pas (d'après le dernier fetch).\n` +
                "    Tu tagues un état qui n'est pas la pointe du dépôt.\n",
        );
    }
}

function afficherCommits() {
    const tag = lireOuNull('git', ['describe', '--tags', '--abbrev=0']);
    const plage = tag ? [`${tag}..HEAD`] : ['HEAD'];
    const sortie = lireOuNull('git', ['log', '--no-merges', '--format=%s', ...plage]);
    const sujets = sortie ? sortie.split('\n') : [];

    console.log(
        tag
            ? `\nDepuis ${tag} — ${sujets.length} commit(s) :\n`
            : `\nAucun tag antérieur — ${sujets.length} commit(s) dans l'historique.` +
                  ' Les 20 plus récents :\n',
    );
    if (sujets.length === 0) {
        console.log('  (aucun)\n');
        return;
    }

    const groupes = grouperCommits(tag ? sujets : sujets.slice(0, 20));
    for (const famille of FAMILLES) {
        const lignes = groupes.get(famille);
        if (!lignes) continue;
        console.log(`  ${famille} (${lignes.length})`);
        for (const ligne of lignes.slice(0, 20)) console.log(`    - ${ligne}`);
        if (lignes.length > 20) console.log(`    … et ${lignes.length - 20} autre(s)`);
    }
    console.log('');
}

// --- empreinte ------------------------------------------------------------

/**
 * `expo.version` sort-elle de l'empreinte ? Défaut prudent : non — c'est le
 * régime qui impose un build à chaque bump, et l'annoncer à tort serait pire
 * que l'inverse.
 */
function versionExclueDeLEmpreinte() {
    try {
        const config = createRequire(import.meta.url)(join(RACINE, 'fingerprint.config.js'));
        return config?.sourceSkips?.includes('ExpoConfigVersions') === true;
    } catch {
        return false;
    }
}

function empreinteLocale() {
    try {
        // ~60 Ko de JSON (152 sources) : le maxBuffer par défaut est trop juste.
        const sortie = lire(
            'npx',
            ['expo-updates', 'fingerprint:generate', '--platform', 'android'],
            { maxBuffer: 32 * 1024 * 1024, timeout: 300_000 },
        );
        const hash = JSON.parse(sortie.slice(sortie.indexOf('{'))).hash;
        return EMPREINTE.test(hash) ? { hash } : { erreur: 'empreinte locale illisible' };
    } catch (e) {
        return { erreur: `calcul local impossible (${e.shortMessage ?? e.message})` };
    }
}

function empreinteDistante() {
    let sortie;
    try {
        // Avec --json, eas envoie tout le non-JSON sur stderr : stdout se parse tel quel.
        sortie = lire(
            'npx',
            [
                'eas',
                'build:list',
                '--platform',
                'android',
                '--build-profile',
                'production',
                '--status',
                'finished',
                '--limit',
                '1',
                '--json',
                '--non-interactive',
            ],
            { maxBuffer: 8 * 1024 * 1024, timeout: 120_000 },
        );
    } catch (e) {
        const details = `${e.stderr ?? ''}`;
        if (/logged in|not authenticated|Log in/i.test(details)) {
            return { erreur: 'session EAS absente (`eas login`)' };
        }
        if (e.signal === 'SIGTERM') return { erreur: 'EAS injoignable (délai dépassé)' };
        return { erreur: `eas build:list a échoué (${e.shortMessage ?? e.message})` };
    }

    try {
        const builds = JSON.parse(sortie);
        if (!Array.isArray(builds) || builds.length === 0) {
            return {
                erreur: "aucun build de production terminé — c'est normal à la première release",
            };
        }
        const build = builds[0];
        const candidat = [build?.fingerprint?.hash, build?.runtimeVersion].find(
            (v) => typeof v === 'string' && EMPREINTE.test(v),
        );
        if (!candidat) return { erreur: "le dernier build ne porte pas d'empreinte lisible" };
        return {
            hash: candidat,
            version: build?.appVersion,
            build: build?.appBuildVersion,
            commit: build?.gitCommitHash?.slice(0, 7),
            date: build?.completedAt?.slice(0, 10),
        };
    } catch {
        return { erreur: "réponse d'eas build:list illisible" };
    }
}

/**
 * Annonce laquelle des deux sorties s'applique, et rend le verdict pour
 * l'épilogue. N'échoue jamais : une comparaison impossible avertit et laisse
 * passer, parce qu'une release bloquée par un réseau capricieux serait un
 * garde-fou qu'on finirait par contourner.
 */
function conclureEmpreinte(actuelle, cible) {
    const locale = empreinteLocale();
    const distante = empreinteDistante();
    const versionExclue = versionExclueDeLEmpreinte();
    const bumpe = actuelle !== cible;

    if (locale.erreur || distante.erreur) {
        console.warn(
            `⚠️  Comparaison d'empreinte impossible : ${locale.erreur ?? distante.erreur}\n` +
                '    La release continue. À vérifier à la main avant toute publication :\n' +
                '      npx expo-updates fingerprint:generate --platform android\n' +
                '      npm run build:list\n',
        );
        return 'inconnu';
    }

    const repere =
        `    locale        ${locale.hash.slice(0, 8)}\n` +
        `    build ${(distante.build ?? '?').padEnd(3)}     ${distante.hash.slice(0, 8)}` +
        `  (${distante.version ?? '?'}, ${distante.commit ?? '?'}, ${distante.date ?? '?'})\n`;

    if (locale.hash !== distante.hash) {
        console.log(
            "⚠️  L'empreinte a changé depuis le dernier build de production.\n" +
                repere +
                '  Un nouveau build est obligatoire. Les builds déjà distribués ne recevront\n' +
                '  plus AUCUNE mise à jour à distance — sans erreur ni message : les\n' +
                '  correctifs n’arrivent simplement jamais.\n' +
                '    npx expo-updates fingerprint:generate --platform android --debug\n' +
                '  liste les sources, pour savoir ce qui a bougé.\n',
        );
        return 'build';
    }

    if (versionExclue || !bumpe) {
        console.log(
            '✓ Empreinte identique au dernier build de production.\n' +
                repere +
                '  Aucun changement natif : cette release peut partir en mise à jour à\n' +
                "  distance, un nouveau build n'est pas nécessaire.\n",
        );
        return 'ota';
    }

    console.log(
        '⚠️  Empreinte identique AVANT le bump — mais elle ne le restera pas.\n' +
            repere +
            "  `fingerprint.config.js` n'exclut pas `ExpoConfigVersions` : `expo.version`\n" +
            `  entre dans l'empreinte. Écrire ${cible} la déplacera, et le build déjà\n` +
            '  distribué cessera de recevoir la moindre mise à jour — silencieusement,\n' +
            '  comme le 3 septembre 2026.\n\n' +
            '  Rien de natif n’a pourtant changé. Deux sorties :\n' +
            `    • assumer le build  →  npm run build:prod (la version affichée passe à ${cible})\n` +
            '    • ou renoncer au bump et publier le correctif tel quel :\n' +
            '          npm run ota:prod -- --message "…"\n',
    );
    return 'build';
}

// --- écriture -------------------------------------------------------------

/** Écrit le plan et rend la fonction qui remet l'arbre exactement comme il était. */
function ecrireFichiers(plan) {
    for (const { chemin, apres } of plan) writeFileSync(chemin, apres, 'utf8');
    return () => {
        for (const { chemin, avant } of plan) {
            if (avant === null) rmSync(chemin, { force: true });
            else writeFileSync(chemin, avant, 'utf8');
        }
    };
}

/**
 * Relecture après écriture : ne pas se fier au code retour. On revérifie
 * l'invariant d'`app-version.test.ts` à la main, puis on passe biome sur les
 * deux fichiers touchés — pour que la CI ne découvre pas une dérive de
 * formatage sur le commit de release, qui est le pire moment.
 */
function verifierEcriture(cible) {
    const app = JSON.parse(readFileSync(APP_JSON, 'utf8')).expo?.version;
    const pkg = JSON.parse(readFileSync(PACKAGE_JSON, 'utf8')).version;
    if (app !== cible || pkg !== cible) {
        return `relecture : app.json=${app}, package.json=${pkg}, attendu ${cible}`;
    }
    const format = spawnSync('npx', ['biome', 'format', 'app.json', 'package.json'], {
        cwd: RACINE,
        stdio: 'inherit',
        encoding: 'utf8',
    });
    return format.status === 0 ? null : 'biome format signale une dérive sur les fichiers écrits';
}

function apercuDiff({ libelle, avant, apres }, cible, actuelle) {
    if (avant === null) {
        console.log(`  ${libelle}  (absent — serait créé, ${apres.split('\n').length} lignes)`);
        return;
    }
    if (avant === apres) {
        console.log(`  ${libelle}  inchangé`);
        return;
    }
    // Le journal n'a pas de ligne "version" : son ajout se décrit en nombre de
    // lignes, pas en diff de version — sans quoi l'aperçu annoncerait un
    // remplacement qui n'a pas lieu.
    const index = avant.indexOf(`"version": "${actuelle}"`);
    if (index === -1) {
        const ajoutees = apres.split('\n').length - avant.split('\n').length;
        console.log(`  ${libelle}  section ${cible} ajoutée en tête (+${ajoutees} lignes)`);
        return;
    }
    console.log(
        `  ${libelle}  ligne ${avant.slice(0, index).split('\n').length}\n` +
            `      - "version": "${actuelle}"\n` +
            `      + "version": "${cible}"`,
    );
}

// --- épilogue -------------------------------------------------------------

function epilogue(actuelle, cible, notes, verdict, commit) {
    const suite =
        verdict === 'ota'
            ? '  2. npm run ota:prod -- --message "…"\n' +
              '     Empreinte inchangée : la mise à jour atteindra le build déjà distribué.\n' +
              '     Un build reste possible si tu veux que Réglages affiche la nouvelle\n' +
              "     version — une mise à jour à distance ne la change pas (l'app lit\n" +
              '     `nativeApplicationVersion`, gravée dans le binaire).'
            : verdict === 'build'
              ? '  2. npm run build:prod\n' +
                "     L'empreinte change avec cette release : un nouveau build est\n" +
                '     obligatoire. EAS attribuera le versionCode — rien à commiter après.'
              : '  2. Empreinte non comparée. Avant toute publication :\n' +
                '       npx expo-updates fingerprint:generate --platform android\n' +
                '       npm run build:list';

    console.log(
        `\n✓ ${cible}\n\n` +
            `  app.json        ${actuelle} → ${cible}\n` +
            `  package.json    ${actuelle} → ${cible}\n` +
            `  CHANGELOG.md    section ${cible} ajoutée (${notes.length} puce(s))\n` +
            `  commit          ${commit}  chore(release): ${cible}\n` +
            `  tag             v${cible} (annoté)\n\n` +
            'À lancer à la main — ce script ne pousse rien et ne build rien :\n\n' +
            '  1. git push --follow-tags\n' +
            '     (un `git push` seul laisserait le tag en local)\n\n' +
            `${suite}\n`,
    );
}

// --- enchaînement ---------------------------------------------------------

function main() {
    // Lecture seule, utilisée par .github/workflows/release.yml pour le corps
    // de la GitHub Release. Court-circuite tout le reste.
    const section = process.argv
        .find((a) => a.startsWith('--section='))
        ?.slice('--section='.length);
    if (section) {
        let journal;
        try {
            journal = readFileSync(CHANGELOG, 'utf8');
        } catch {
            echouer('✗ CHANGELOG.md est absent.');
        }
        const corps = extraireSection(journal, section);
        if (!corps) echouer(`✗ Aucune section ${section} dans CHANGELOG.md.`);
        console.log(corps);
        process.exit(0);
    }

    const dryRun = process.argv.includes('--dry-run');
    const sansVerifs = process.argv.includes('--skip-checks');
    const sansEmpreinte = process.argv.includes('--skip-fingerprint');

    // 1) Version cible
    const { actuelle, appTexte, pkgTexte } = versionsActuelles();
    let cible;
    try {
        ({ cible } = resoudreCible(actuelle, process.argv));
    } catch (e) {
        echouer(e.message);
    }

    // 2) État du dépôt
    gardesDepot(cible);

    // 3) Aide-mémoire, avant d'exiger les notes : c'est la matière première.
    afficherCommits();

    // 4) Notes
    const notes = lireNotes(process.argv);
    if (notes.length === 0 || notes.join(' ').trim().length < 10) {
        echouer(
            '✗ Notes manquantes ou trop courtes (10 caractères minimum).\n' +
                '    npm run release -- --minor --notes "Ce que cette version apporte"\n' +
                '  Elles deviennent la section du CHANGELOG et le corps du tag annoté.\n' +
                '  Une puce par --notes. La liste ci-dessus est là pour aider : recopie ce\n' +
                "  qu'un utilisateur remarquerait, pas ce que le code a changé.",
        );
    }
    const longueur = notes.join('\n').length;
    if (longueur > PLAFOND_PLAY) {
        console.warn(
            `⚠️  Notes longues de ${longueur} caractères. Le champ « Nouveautés de cette\n` +
                `    version » de la Play Console en accepte ${PLAFOND_PLAY} : il faudra les\n` +
                '    raccourcir là-bas (docs/stores/play-store.md).\n',
        );
    }

    // 5) Vérifications de la CI
    if (sansVerifs) {
        console.warn('⚠️  --skip-checks : les 4 vérifications de la CI sont sautées.\n');
    } else {
        console.log('Vérifications avant release…\n');
        const etapes = [
            ['format:check', ['run', 'format:check']],
            ['typecheck', ['run', 'typecheck']],
            ['tests', ['test']],
            ['lint', ['run', 'lint', '--', '--max-warnings', '0']],
        ];
        for (const [libelle, args] of etapes) {
            if (run('npm', args).status !== 0) {
                echouer(`\n✗ ${libelle} en échec — rien n'a été écrit, rien n'a été commité.`);
            }
        }
    }

    // 6) Empreinte, calculée AVANT l'écriture : sinon le bump se compare à lui-même.
    let verdict = 'inconnu';
    if (sansEmpreinte) {
        console.warn(
            "⚠️  --skip-fingerprint : la comparaison d'empreinte est sautée.\n" +
                "    C'est le garde-fou n°1 du projet.\n",
        );
    } else {
        console.log('\nEmpreinte (une quinzaine de secondes)…\n');
        verdict = conclureEmpreinte(actuelle, cible);
    }

    // 7) Plan d'écriture
    let changelogAvant = null;
    try {
        changelogAvant = readFileSync(CHANGELOG, 'utf8');
    } catch {
        changelogAvant = null;
    }
    const date = new Date().toISOString().slice(0, 10);
    let plan;
    try {
        plan = [
            {
                chemin: APP_JSON,
                libelle: 'app.json    ',
                avant: appTexte,
                apres:
                    actuelle === cible
                        ? appTexte
                        : remplacerVersion(appTexte, actuelle, cible, 'app.json'),
            },
            {
                chemin: PACKAGE_JSON,
                libelle: 'package.json',
                avant: pkgTexte,
                apres:
                    actuelle === cible
                        ? pkgTexte
                        : remplacerVersion(pkgTexte, actuelle, cible, 'package.json'),
            },
            {
                chemin: CHANGELOG,
                libelle: 'CHANGELOG.md',
                avant: changelogAvant,
                apres: changelogAvecSection(changelogAvant, sectionChangelog(cible, notes, date)),
            },
        ];
    } catch (e) {
        echouer(e.message);
    }

    if (dryRun) {
        console.log("--dry-run : rien n'a été écrit.\n");
        for (const p of plan) apercuDiff(p, cible, actuelle);
        console.log(`\n  Section ${cible} :\n`);
        console.log(
            sectionChangelog(cible, notes, date)
                .split('\n')
                .map((l) => `    ${l}`)
                .join('\n'),
        );
        console.log(
            '  Seraient exécutés :\n' +
                '    git add app.json package.json CHANGELOG.md\n' +
                `    git commit -m "chore(release): ${cible}"\n` +
                `    git tag -a v${cible} -m "TryCast ${cible}" -m "<notes>"\n`,
        );
        process.exit(0);
    }

    // 8) Écriture, relecture, commit, tag
    const restaurer = ecrireFichiers(plan);
    const derive = verifierEcriture(cible);
    if (derive) {
        restaurer();
        echouer(
            `✗ ${derive}\n` +
                "  Les fichiers ont été remis dans leur état d'origine ; aucun commit n'a\n" +
                '  été créé. `git status` doit être vide.',
        );
    }

    if (run('git', ['add', 'app.json', 'package.json', 'CHANGELOG.md']).status !== 0) {
        restaurer();
        echouer("✗ git add a échoué — l'arbre a été remis dans son état d'origine.");
    }
    if (run('git', ['commit', '-m', `chore(release): ${cible}`]).status !== 0) {
        restaurer();
        echouer(
            "✗ git commit a échoué — l'arbre a été remis dans son état d'origine.\n" +
                '  `git status` doit être vide. Relance quand la cause est levée.',
        );
    }

    const corps = notes.map((n) => `- ${n}`).join('\n');
    if (
        run('git', ['tag', '-a', `v${cible}`, '-m', `TryCast ${cible}`, '-m', corps]).status !== 0
    ) {
        // Volontairement pas de reset automatique : un `git reset --hard` déclenché
        // par un script sur un dépôt réel est plus dangereux que le désordre qu'il
        // prétend réparer.
        echouer(
            `✗ Le commit a été créé, mais git tag a échoué.\n` +
                '  Rien n’est perdu et rien n’a été poussé. Deux sorties :\n' +
                `    • poser le tag seul :  git tag -a v${cible} -m "TryCast ${cible}"\n` +
                '    • ou tout annuler :    git reset --hard HEAD~1\n' +
                '      (ce commit ne contient que le bump et le journal)',
        );
    }

    epilogue(actuelle, cible, notes, verdict, lireOuNull('git', ['rev-parse', '--short', 'HEAD']));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    main();
}
