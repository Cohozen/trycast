#!/usr/bin/env node
/**
 * Sème la 4e journée du Nations Championship comme matchs à venir, pour pouvoir
 * capturer l'écran Matchs — le geste central de l'app — tant que le fournisseur
 * n'a pas publié la suite du calendrier.
 *
 *   node scripts/seed-screenshot-matches.mjs           # sème
 *   node scripts/seed-screenshot-matches.mjs --purge   # retire tout
 *
 * Ce ne sont PAS des affiches inventées : ce sont les vraies rencontres des
 * 6-8 novembre 2026, relevées sur les calendriers publics (Sky Sports,
 * Wikipedia, Rugby World). Seules les heures de coup d'envoi sont approchées —
 * les sources donnent les dates, pas les horaires. Les cotes sont plausibles et
 * marquées `default`, jamais présentées comme venant du fournisseur.
 *
 * ⚠️ DÉVELOPPEMENT UNIQUEMENT. Le script refuse tout projet autre que celui du
 * `.env` : des matchs semés à la main en production s'afficheraient aux vrais
 * testeurs et seraient dupliqués le jour où sync-fixtures publie les mêmes
 * rencontres. Les identifiants sont négatifs, comme le reste des données de
 * test, pour ne jamais entrer en collision avec ceux du fournisseur.
 *
 * À purger dès que sync-fixtures ramène les vraies journées.
 */

import { execFileSync } from 'node:child_process';

import { devProjectRef } from './project-ref.mjs';

// 4e journée, 6-8 novembre 2026. Heures approchées : créneaux habituels de la
// fenêtre d'automne, l'important pour une capture est qu'elles soient crédibles.
const JOURNEE = [
    ['Ireland', 'Argentina', '2026-11-06T20:10:00Z', 1.35, 22.0, 3.4],
    ['Italy', 'South Africa', '2026-11-07T13:40:00Z', 6.5, 26.0, 1.14],
    ['Scotland', 'New Zealand', '2026-11-07T15:40:00Z', 3.8, 24.0, 1.27],
    ['Wales', 'Japan', '2026-11-07T17:40:00Z', 1.45, 21.0, 2.75],
    ['France', 'Fiji', '2026-11-08T15:10:00Z', 1.18, 25.0, 5.0],
    ['England', 'Australia', '2026-11-08T17:40:00Z', 1.62, 23.0, 2.3],
];

const purge = process.argv.includes('--purge');
const ref = devProjectRef();
const URL = `https://${ref}.supabase.co`;

// Garde-fou : aucun argument ne permet de viser un autre projet. Le ref vient du
// `.env`, qui pointe le développement par construction (cf. scripts/README.md).
if (process.argv.some((a) => a.startsWith('--project'))) {
    console.error(
        '✗ Ce script ne vise que le projet du .env. Des matchs fictifs en production\n' +
            "  s'afficheraient aux vrais testeurs — il n'y a pas d'option pour le forcer.",
    );
    process.exit(1);
}

function serviceRoleKey() {
    const out = execFileSync('supabase', ['projects', 'api-keys', '--project-ref', ref, '-o', 'json'], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
    });
    return JSON.parse(out).find((k) => k.name === 'service_role').api_key;
}

const KEY = serviceRoleKey();
const entetes = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };

async function rest(chemin, options = {}) {
    const res = await fetch(`${URL}/rest/v1/${chemin}`, {
        ...options,
        headers: { ...entetes, ...(options.headers ?? {}) },
    });
    const texte = await res.text();
    if (!res.ok) throw new Error(`${options.method ?? 'GET'} ${chemin} → ${res.status} ${texte}`);
    return texte ? JSON.parse(texte) : null;
}

// Les identifiants -9001 à -9006 sont réservés à cette journée : la purge les
// vise nommément plutôt que de supprimer « tous les négatifs », qui emporterait
// les seeds e2e.
const IDS = JOURNEE.map((_, i) => -9001 - i);

const dejaLa = await rest(`matches?api_game_id=in.(${IDS.join(',')})&select=id`);
if (dejaLa.length > 0) {
    await rest(`matches?api_game_id=in.(${IDS.join(',')})`, { method: 'DELETE' });
    console.log(`${dejaLa.length} match(s) de capture retiré(s).`);
}
if (purge) {
    console.log('Purge terminée.');
    process.exit(0);
}

const [competition] = await rest('competitions?slug=eq.nc-2026&select=id,name');
if (!competition) {
    console.error('✗ Compétition nc-2026 absente. Joue scripts/seed-competitions.sql.');
    process.exit(1);
}

const equipes = Object.fromEntries(
    (await rest('teams?select=id,name')).map((t) => [t.name, t.id]),
);
const manquantes = JOURNEE.flatMap(([d, e]) => [d, e]).filter((n) => !equipes[n]);
if (manquantes.length > 0) {
    console.error(
        `✗ Équipes absentes de la base : ${[...new Set(manquantes)].join(', ')}.\n` +
            '  Lance sync-fixtures : les équipes arrivent avec les matchs.',
    );
    process.exit(1);
}

await rest('matches', {
    method: 'POST',
    body: JSON.stringify(
        JOURNEE.map(([dom, ext, coup, cd, cn, ce], i) => ({
            api_game_id: IDS[i],
            competition_id: competition.id,
            home_team_id: equipes[dom],
            away_team_id: equipes[ext],
            kickoff_at: coup,
            status: 'scheduled',
            // Le fournisseur ne met que le numéro (« 1 », « 2 », « 3 ») et l'écran
            // préfixe « Journée » lui-même : y mettre le mot donnait « JOURNÉE JOURNÉE 4 ».
            round: '4',
            odds_home: cd,
            odds_draw: cn,
            odds_away: ce,
            odds_source: 'default',
            odds_captured_at: new Date().toISOString(),
        })),
    ),
});

console.log(`${JOURNEE.length} matchs semés sur « ${competition.name} » :\n`);
for (const [dom, ext, coup] of JOURNEE) {
    const d = new Date(coup).toLocaleString('fr-FR', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Europe/Paris',
    });
    console.log(`  ${d.padEnd(24)} ${dom} – ${ext}`);
}
console.log('\nÀ purger avec --purge dès que sync-fixtures ramène les vraies journées.');
