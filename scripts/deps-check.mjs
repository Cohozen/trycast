#!/usr/bin/env node
/**
 * Veille des dépendances : dit où en est l'écart, et ne touche à rien.
 *
 *   npm run deps:check              rapport lisible au terminal
 *   npm run deps:check -- --markdown   le même en Markdown (corps de l'issue hebdomadaire)
 *   npm run deps:check -- --json       la structure brute
 *
 * Pourquoi un script plutôt qu'un `npm outdated` : sur un projet Expo, la liste
 * brute est ininterprétable. Sur les 50 paquets qu'elle affiche aujourd'hui, la
 * moitié est pilotée par le SDK — suivre leur `latest` casserait le projet — et
 * un autre est un faux positif permanent. Un retard n'a de sens qu'une fois
 * rangé dans sa famille, parce que chaque famille appelle une décision
 * différente, et que trois d'entre elles n'en appellent aucune.
 *
 * Le script ne modifie jamais rien et ne fait pas échouer une CI sur de la
 * dérive de versions : c'est un diagnostic, pas un garde-fou (décision actée —
 * bloquer là-dessus arrêterait des livraisons sans rapport). Il sort donc en
 * code 0, à une exception près : quand la **collecte** a échoué (registre
 * injoignable), il sort en 1. Un rapport annonçant « 0 paquet en retard » parce
 * qu'il n'a rien pu lire serait pire que pas de rapport du tout.
 *
 * Les commandes proposées ne sont jamais exécutées : elles sont affichées.
 */

import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..');
const APP = join(RACINE, 'apps', 'mobile');

/**
 * Paquets dont le retard affiché par npm est un artefact, avec sa raison.
 * Y ajouter une entrée doit rester exceptionnel : tout ce qui est piloté par le
 * SDK est déjà écarté dynamiquement (cf. `perimetreSdk`).
 */
const ECARTES = {
    nativewind:
        'installé en préversion 5 ; le `latest` publié (4.x) est la ligne précédente — faux positif permanent',
};

/** Précisions attachées à un paquet, affichées sous sa ligne. */
const NOTES = {
    '@biomejs/biome': 'version épinglée : formate tout le dépôt, CI comprise',
    vitest: 'déclaré à la fois à la racine et dans `apps/mobile/` : garder les deux alignés',
    typescript:
        'déclaré à la fois dans `apps/mobile/` et dans `apps/web/` : garder les deux alignés',
};

// --- Lecture des sources --------------------------------------------------

const executer = (cmd, args, cwd) =>
    spawnSync(cmd, args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

/** `npm outdated --json` — code retour 1 quand il y a du retard, ce n'est pas une erreur. */
const lireOutdated = (cwd) => {
    const res = executer('npm', ['outdated', '--json'], cwd);
    if (res.error) return { erreur: res.error.message, paquets: {} };
    try {
        const brut = JSON.parse(res.stdout || '{}');
        if (brut.error) {
            return {
                erreur: `npm outdated a échoué (${brut.error.code ?? 'erreur'}) — le rapport est incomplet`,
                paquets: {},
            };
        }
        return { paquets: brut };
    } catch {
        return {
            erreur: 'sortie de `npm outdated` illisible — le rapport est incomplet',
            paquets: {},
        };
    }
};

/** Synthèse `npm audit`, par sévérité. */
const lireAudit = (cwd) => {
    const res = executer('npm', ['audit', '--json'], cwd);
    try {
        const v = JSON.parse(res.stdout || '{}')?.metadata?.vulnerabilities;
        return v ? { ...v } : undefined;
    } catch {
        return undefined;
    }
};

/**
 * Ce que le SDK attend, d'après Expo lui-même.
 *
 * C'est l'autorité vivante : le manifeste embarqué dans `node_modules` fige les
 * versions du jour de sa publication (il annonce encore `react-native@0.86.0`)
 * alors que `expo install --check` interroge le manifeste à jour (0.86.3).
 * Sortie parsée : « expo-image@57.0.0 - expected version: ~57.0.4 ».
 */
const desalignementsSdk = () => {
    const res = executer('npx', ['expo', 'install', '--check'], APP);
    const sortie = `${res.stdout ?? ''}\n${res.stderr ?? ''}`;
    if (res.error) return { erreur: res.error.message, attendu: new Map() };
    const attendu = new Map();
    for (const ligne of sortie.split('\n')) {
        const m = ligne.match(/^\s*(\S+)@(\S+)\s+-\s+expected version:\s+(\S+)\s*$/);
        if (m) attendu.set(m[1], { installee: m[2], attendue: m[3] });
    }
    // Aucune ligne et aucun message rassurant : la commande a échoué (réseau ?).
    const alignes = /up to date|Dependencies are up to date/i.test(sortie);
    if (attendu.size === 0 && !alignes) {
        return { erreur: 'expo install --check n’a rien pu dire (réseau ?)', attendu };
    }
    return { attendu };
};

/** Les 122 paquets dont le SDK dicte la version — leur `latest` ne se suit pas. */
const perimetreSdk = () => {
    const chemin = join(APP, 'node_modules/expo/bundledNativeModules.json');
    if (!existsSync(chemin)) return new Map();
    try {
        return new Map(Object.entries(JSON.parse(readFileSync(chemin, 'utf8'))));
    } catch {
        return new Map();
    }
};

/** Version majeure du SDK installé, pour nommer les familles sans la coder en dur. */
const versionSdk = () => {
    const chemin = join(APP, 'node_modules/expo/package.json');
    if (!existsSync(chemin)) return '?';
    try {
        return JSON.parse(readFileSync(chemin, 'utf8')).version.split('.')[0];
    } catch {
        return '?';
    }
};

/**
 * Un paquet est natif s'il embarque du code de plateforme : le monter impose un
 * rebuild du dev client et déplace l'empreinte des mises à jour à distance.
 */
const estNatif = (nom, cwd) => {
    const base = join(cwd, 'node_modules', nom);
    if (!existsSync(base)) return false;
    if (
        existsSync(join(base, 'expo-module.config.json')) ||
        existsSync(join(base, 'android')) ||
        existsSync(join(base, 'ios'))
    ) {
        return true;
    }
    // react-native lui-même n'a ni `android/` ni `ios/` : ses sources de
    // plateforme vivent dans ReactAndroid/ et des podspecs à la racine.
    return readdirSync(base).some(
        (e) => e.endsWith('.podspec') || e === 'build.gradle' || e === 'build.gradle.kts',
    );
};

// --- Classement -----------------------------------------------------------

const decouper = (v) =>
    (v ?? '')
        .match(/^(\d+)\.(\d+)\.(\d+)/)
        ?.slice(1)
        .map(Number);

/**
 * Ampleur du saut. En 0.x, une mineure est cassante par convention semver :
 * `@aptabase/react-native` 0.5 → 0.6 est une décision, pas un rattrapage.
 */
const saut = (de, vers) => {
    const a = decouper(de);
    const b = decouper(vers);
    if (!a || !b) return 'inconnu';
    if (a[0] !== b[0]) return 'majeur';
    if (a[0] === 0 && a[1] !== b[1]) return 'majeur';
    if (a[1] !== b[1]) return 'mineur';
    return 'patch';
};

/**
 * Range chaque paquet en retard dans une et une seule famille, par priorité
 * décroissante : un artefact connu, ce que le SDK réclame, ce que le SDK
 * interdit de suivre, une majeure à instruire, un rattrapage sans risque, une
 * mineure à prendre quand ça arrange.
 */
const analyser = ({ cwd, sdkAttendu = new Map(), sdkPerimetre = new Map() }) => {
    const { paquets, erreur } = lireOutdated(cwd);
    const familles = { sdk: [], rattrapage: [], mineures: [], majeures: [], ecartes: [] };

    for (const [nom, info] of Object.entries(paquets)) {
        const { current, wanted, latest } = info;
        // Un paquet listé sans version installée n'est pas installé du tout.
        if (!current) continue;
        const ligne = {
            nom,
            current,
            wanted,
            latest,
            natif: estNatif(nom, cwd),
            note: NOTES[nom],
        };

        if (ECARTES[nom]) {
            familles.ecartes.push({ ...ligne, raison: ECARTES[nom] });
            continue;
        }
        const reclame = sdkAttendu.get(nom);
        if (reclame) {
            familles.sdk.push({ ...ligne, attendue: reclame.attendue });
            continue;
        }
        if (sdkPerimetre.has(nom)) {
            familles.ecartes.push({
                ...ligne,
                raison: `piloté par le SDK (il veut \`${sdkPerimetre.get(nom)}\`) — la suite viendra avec un SDK, pas avec un \`npm i\``,
            });
            continue;
        }
        const ampleur = saut(current, latest);
        if (ampleur === 'majeur') {
            familles.majeures.push({ ...ligne, ampleur });
            continue;
        }
        if (current !== wanted) {
            familles.rattrapage.push({ ...ligne, ampleur });
            continue;
        }
        familles.mineures.push({ ...ligne, ampleur });
    }

    for (const liste of Object.values(familles)) liste.sort((a, b) => a.nom.localeCompare(b.nom));
    return { erreur, familles, audit: lireAudit(cwd) };
};

// --- Rendu ----------------------------------------------------------------

const RAPPEL_NATIF =
    'Un paquet marqué ⚑ impose un rebuild du dev client et **déplace l’empreinte** : ' +
    'les builds déjà distribués cesseraient de recevoir les mises à jour à distance. ' +
    'Ces montées se groupent avec une release, jamais au fil de l’eau.';

const marqueur = (l) => (l.natif ? ' ⚑ natif' : '');

/** Ce que la commande de la section installera réellement. */
const cibleDe = (bloc, l) => {
    if (bloc.cle === 'sdk') return l.attendue;
    if (bloc.cle === 'rattrapage') return l.wanted;
    return l.latest;
};

/** Précisions calculées, communes aux deux rendus. */
const precisions = (bloc, l) => {
    const bouts = [];
    if (l.raison) bouts.push(l.raison);
    if (l.note) bouts.push(l.note);
    if (bloc.cle === 'rattrapage' && l.wanted !== l.latest) {
        bouts.push(`hors plage, à décider séparément : ${l.latest}`);
    }
    // Les sections du site et de l'outillage mélangent les trois familles : la cible
    // affichée y est le `latest`, donc il faut dire quand `npm update` n'ira pas jusque-là.
    if (
        (bloc.cle === 'web' || bloc.cle === 'outillage') &&
        l.wanted !== l.current &&
        l.wanted !== l.latest
    ) {
        bouts.push(`\`npm update\` s'arrête à ${l.wanted}`);
    }
    if (bloc.cle === 'majeures' && l.current !== l.wanted) {
        bouts.push(`rattrapage sans décision disponible : ${l.wanted}`);
    }
    return bouts;
};

const dansUneIssue = (n) => (n === 1 ? '1 paquet' : `${n} paquets`);

const construireRapport = (app, web, sdk, outillage) => {
    const s = [];
    const total = (bloc) =>
        ['sdk', 'rattrapage', 'mineures', 'majeures'].reduce(
            (n, cle) => n + (bloc.familles[cle]?.length ?? 0),
            0,
        );
    const ecartes = (bloc) => bloc.familles.ecartes?.length ?? 0;

    s.push({
        type: 'entete',
        sdk,
        totalApp: total(app),
        totalWeb: web.absent ? undefined : total(web),
        ecartesApp: ecartes(app),
        erreur: app.erreur,
    });

    s.push({
        type: 'section',
        cle: 'sdk',
        titre: `À réaligner sur le SDK ${sdk}`,
        pourquoi:
            'Expo réclame ces versions : elles sont testées ensemble, et le décalage se rattrape en une commande.',
        commande: 'npx expo install --fix',
        lignes: app.familles.sdk,
    });
    s.push({
        type: 'section',
        cle: 'majeures',
        titre: 'Majeures — une décision par ligne',
        pourquoi:
            'Rien à faire dans l’immédiat : chacune doit porter sa raison dans `docs/dependances.md`, avec la condition qui déclenchera la montée.',
        lignes: app.familles.majeures,
    });
    s.push({
        type: 'section',
        cle: 'rattrapage',
        titre: 'Rattrapage dans la plage déclarée',
        pourquoi: 'Déjà autorisé par `package.json` : rien à décider, seul le lock bouge.',
        commande: 'npm update',
        lignes: app.familles.rattrapage,
    });
    s.push({
        type: 'section',
        cle: 'mineures',
        titre: 'Mineures hors plage',
        pourquoi: 'À prendre quand ça arrange ; lire les notes de version reste utile.',
        lignes: app.familles.mineures,
    });
    s.push({
        type: 'section',
        cle: 'ecartes',
        titre: 'Écartés — ce n’est pas du retard',
        pourquoi: 'Suivre leur `latest` serait une régression. Ils ne comptent pas dans l’écart.',
        lignes: app.familles.ecartes,
    });
    if (!web.absent) {
        s.push({
            type: 'section',
            cle: 'web',
            titre: 'Site vitrine (`apps/web/`)',
            pourquoi:
                'Sous-dossier autonome, son propre lock — vérifié avec `cd apps/web && npm run check && npm run build`.',
            lignes: [
                ...web.familles.majeures,
                ...web.familles.rattrapage,
                ...web.familles.mineures,
            ].sort((a, b) => a.nom.localeCompare(b.nom)),
        });
    }
    if (!outillage.absent) {
        s.push({
            type: 'section',
            cle: 'outillage',
            titre: 'Outillage du dépôt (racine)',
            pourquoi:
                'Formatage et tests des Edge Functions, sans effet sur les builds — vérifié avec `npm run verify` à la racine.',
            lignes: [
                ...outillage.familles.majeures,
                ...outillage.familles.rattrapage,
                ...outillage.familles.mineures,
            ].sort((a, b) => a.nom.localeCompare(b.nom)),
        });
    }
    return s;
};

const sansBalisage = (t) => t.replace(/[`*]/g, '');

/** Une ligne de synthèse par projet, seulement s'il y a quelque chose à dire. */
const lignesAudit = (app, web) =>
    [
        ['app', app],
        ['web', web],
    ]
        .filter(([, bloc]) => bloc.audit?.total)
        .map(([libelle, bloc]) => {
            const { critical, high, moderate, low, total } = bloc.audit;
            return `**npm audit (${libelle})** : ${total} — ${critical} critique(s), ${high} élevée(s), ${moderate} modérée(s), ${low} faible(s).`;
        });

/**
 * Dans une issue GitHub, un chemin relatif ne pointe nulle part : on construit
 * l'URL complète quand le workflow nous donne le dépôt, et on se rabat sur le
 * chemin nu en local.
 */
const lienJournal = () => {
    const { GITHUB_SERVER_URL: serveur, GITHUB_REPOSITORY: depot } = process.env;
    return serveur && depot
        ? `[\`docs/dependances.md\`](${serveur}/${depot}/blob/main/docs/dependances.md)`
        : '\`docs/dependances.md\`';
};

const rendreTexte = (rapport, app, web) => {
    const out = [];
    let unNatif = false;
    for (const bloc of rapport) {
        if (bloc.type === 'entete') {
            out.push('');
            out.push(`Veille des dépendances — SDK ${bloc.sdk}`);
            if (bloc.erreur) {
                out.push('');
                out.push(`  ✗ ${bloc.erreur}.`);
                out.push(
                    '    Les chiffres ci-dessous ne veulent rien dire tant que ce n’est pas réglé.',
                );
            }
            out.push(
                `  app : ${dansUneIssue(bloc.totalApp)} en retard (+ ${bloc.ecartesApp} écarté(s))` +
                    (bloc.totalWeb === undefined
                        ? '  ·  web : non installé (npm ci --prefix apps/web)'
                        : `  ·  web : ${dansUneIssue(bloc.totalWeb)}`),
            );
            out.push('');
            continue;
        }
        const n = bloc.lignes.length;
        out.push(`── ${sansBalisage(bloc.titre)} (${n})`);
        if (n === 0) {
            out.push('   rien');
            out.push('');
            continue;
        }
        out.push(`   ${sansBalisage(bloc.pourquoi)}`);
        if (bloc.commande) out.push(`   → ${bloc.commande}`);
        out.push('');
        for (const l of bloc.lignes) {
            unNatif = unNatif || l.natif;
            out.push(`   ${l.nom.padEnd(42)} ${l.current} → ${cibleDe(bloc, l)}${marqueur(l)}`);
            for (const p of precisions(bloc, l)) {
                out.push(`   ${' '.repeat(42)} ${sansBalisage(p)}`);
            }
        }
        out.push('');
    }
    if (unNatif) {
        out.push(`⚑ ${sansBalisage(RAPPEL_NATIF)}`);
        out.push('');
    }
    out.push(...lignesAudit(app, web).map(sansBalisage));
    out.push('');
    out.push('Journal des décisions : docs/dependances.md');
    out.push('');
    return out.join('\n');
};

const rendreMarkdown = (rapport, app, web, majeures) => {
    const out = [];
    let unNatif = false;
    for (const bloc of rapport) {
        if (bloc.type === 'entete') {
            out.push(`# Veille des dépendances — SDK ${bloc.sdk}`);
            out.push('');
            if (bloc.erreur) {
                out.push(
                    `> ✗ **${bloc.erreur}.** Les chiffres ci-dessous ne veulent rien dire tant que ce n’est pas réglé.`,
                );
                out.push('');
            }
            out.push(
                `**${dansUneIssue(bloc.totalApp)}** en retard côté app, plus ${bloc.ecartesApp} écarté(s)` +
                    (bloc.totalWeb === undefined
                        ? '. Le site n’a pas été analysé (dépendances non installées).'
                        : `, et **${dansUneIssue(bloc.totalWeb)}** côté site.`) +
                    ' Rien n’a été modifié : ce rapport ne fait que constater.',
            );
            out.push('');
            continue;
        }
        out.push(`## ${bloc.titre} (${bloc.lignes.length})`);
        out.push('');
        if (bloc.lignes.length === 0) {
            out.push('Rien.');
            out.push('');
            continue;
        }
        out.push(bloc.pourquoi);
        out.push('');
        if (bloc.commande) {
            out.push('```bash');
            out.push(bloc.commande);
            out.push('```');
            out.push('');
        }
        out.push('| Paquet | Installé | Cible | |');
        out.push('|---|---|---|---|');
        for (const l of bloc.lignes) {
            unNatif = unNatif || l.natif;
            const bouts = [...(l.natif ? ['⚑ natif'] : []), ...precisions(bloc, l)];
            out.push(
                `| \`${l.nom}\` | ${l.current} | ${cibleDe(bloc, l)} | ${bouts.join(' · ')} |`,
            );
        }
        out.push('');
    }
    if (unNatif) {
        out.push(`> ⚑ ${RAPPEL_NATIF}`);
        out.push('');
    }
    for (const ligne of lignesAudit(app, web)) {
        out.push(ligne);
        out.push('');
    }
    out.push(`Le détail des décisions vit dans ${lienJournal()}.`);
    out.push('');
    // Signature lue par le workflow hebdomadaire : elle seule décide s'il faut
    // notifier. Sans elle, l'issue commenterait 52 fois par an la même chose.
    out.push(`<!-- majeures: ${majeures.join(',') || 'aucune'} -->`);
    return out.join('\n');
};

// --- Exécution ------------------------------------------------------------

const sdk = versionSdk();
const { attendu, erreur: erreurSdk } = desalignementsSdk();
const bloc = analyser({
    cwd: APP,
    sdkAttendu: attendu,
    sdkPerimetre: perimetreSdk(),
});
if (erreurSdk) bloc.erreur = [bloc.erreur, erreurSdk].filter(Boolean).join(' · ');

const cheminWeb = join(RACINE, 'apps', 'web');
const web = existsSync(join(cheminWeb, 'node_modules'))
    ? analyser({ cwd: cheminWeb })
    : {
          absent: true,
          familles: { sdk: [], rattrapage: [], mineures: [], majeures: [], ecartes: [] },
      };

const outillage = existsSync(join(RACINE, 'node_modules'))
    ? analyser({ cwd: RACINE })
    : {
          absent: true,
          familles: { sdk: [], rattrapage: [], mineures: [], majeures: [], ecartes: [] },
      };

const rapport = construireRapport(bloc, web, sdk, outillage);
const majeures = [
    ...new Set([
        ...bloc.familles.majeures.map((l) => `${l.nom}@${l.latest}`),
        ...(web.familles?.majeures ?? []).map((l) => `web/${l.nom}@${l.latest}`),
        ...(outillage.familles?.majeures ?? []).map((l) => `racine/${l.nom}@${l.latest}`),
    ]),
].sort();

const codeSortie = bloc.erreur ? 1 : 0;

if (process.argv.includes('--json')) {
    console.log(JSON.stringify({ sdk, app: bloc, web, outillage, majeures }, null, 2));
} else if (process.argv.includes('--markdown')) {
    console.log(rendreMarkdown(rapport, bloc, web, majeures));
} else {
    console.log(rendreTexte(rapport, bloc, web));
}

process.exit(codeSortie);
