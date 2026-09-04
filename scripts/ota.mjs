#!/usr/bin/env node
/**
 * Publie une mise à jour à distance (EAS Update) sur un canal.
 *
 *   npm run ota:preview -- --message "Corrige le décompte du rappel"
 *   npm run ota:prod    -- --message "Corrige le décompte du rappel"
 *
 * Pourquoi un script plutôt qu'une ligne dans package.json : `eas update` est la
 * seule commande du projet qui change **instantanément** ce que les utilisateurs
 * exécutent, sans relecture de Google ni téléversement. Elle mérite les gardes
 * que le passage par le store fournit gratuitement :
 *
 *   1. arbre de travail propre — publier du code non commité, c'est perdre la
 *      trace de ce que les gens font tourner (EAS le signale d'un astérisque
 *      après le hash du commit, facile à ne pas voir) ;
 *   2. typecheck et tests au vert avant l'envoi ;
 *   3. un message obligatoire et lisible, qui devient l'étiquette de la mise à
 *      jour dans le tableau de bord.
 *
 * `--skip-checks` saute typecheck et tests (correctif d'urgence). `--allow-dirty`
 * lève la contrainte de l'arbre propre : à n'utiliser qu'en connaissance de cause.
 */

import { execFileSync, spawnSync } from 'node:child_process';

const CANAUX = {
    preview: { environment: 'preview', public: false },
    production: { environment: 'production', public: true },
};

const arg = (nom) =>
    process.argv.find((a) => a.startsWith(`--${nom}=`))?.slice(nom.length + 3) ?? undefined;

const canal = arg('channel');
if (!CANAUX[canal]) {
    console.error(
        `Canal inconnu : ${canal ?? '(aucun)'}\n  Attendu : ${Object.keys(CANAUX).join(' ou ')}`,
    );
    process.exit(1);
}

// Le message peut venir de --message=… ou de « --message "…" » (forme naturelle
// derrière un `npm run … --`), d'où la lecture des deux.
const i = process.argv.indexOf('--message');
const message = i !== -1 ? process.argv[i + 1] : arg('message');
if (!message || message.trim().length < 10) {
    console.error(
        'Message manquant ou trop court (10 caractères minimum).\n' +
            `  npm run ota:${canal === 'production' ? 'prod' : canal} -- --message "Ce que corrige cette mise à jour"\n` +
            "  Il devient l'étiquette de la mise à jour : « fix » ne dira rien dans trois semaines.",
    );
    process.exit(1);
}

const sansVerifs = process.argv.includes('--skip-checks');
const arbreSaleAutorise = process.argv.includes('--allow-dirty');

const run = (cmd, args) => spawnSync(cmd, args, { stdio: 'inherit', encoding: 'utf8' });
const lire = (cmd, args) =>
    execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

// --- 1) Arbre de travail --------------------------------------------------
const sale = lire('git', ['status', '--porcelain']);
if (sale && !arbreSaleAutorise) {
    console.error(
        '✗ Arbre de travail non propre. Une mise à jour publiée depuis un arbre sale\n' +
            "  n'est rattachable à aucun commit : impossible de savoir plus tard ce que\n" +
            '  les utilisateurs exécutaient.\n\n' +
            `${sale}\n\n` +
            '  Commite, ou passe --allow-dirty en connaissance de cause.',
    );
    process.exit(1);
}

// --- 2) Vérifications -----------------------------------------------------
if (!sansVerifs) {
    console.log('Vérifications avant publication…\n');
    for (const [libelle, script] of [
        ['typecheck', 'typecheck'],
        ['tests', 'test'],
    ]) {
        const res = run('npm', ['run', script]);
        if (res.status !== 0) {
            console.error(`\n✗ ${libelle} en échec — rien n'a été publié.`);
            process.exit(1);
        }
    }
} else {
    console.warn('⚠️  --skip-checks : typecheck et tests sautés.\n');
}

// --- 3) Publication -------------------------------------------------------
const { environment, public: enProd } = CANAUX[canal];
const commit = lire('git', ['rev-parse', '--short', 'HEAD']);

console.log(
    `\nCanal   : ${canal}${enProd ? '  ⚠️  vu par les testeurs dès leur prochain lancement' : ''}\n` +
        `Commit  : ${commit}\n` +
        `Message : ${message}\n`,
);

const res = run('eas', [
    'update',
    '--channel',
    canal,
    '--environment',
    environment,
    '--message',
    message,
    '--non-interactive',
]);
process.exit(res.status ?? 0);
