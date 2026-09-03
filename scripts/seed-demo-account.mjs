#!/usr/bin/env node
/**
 * Crée le compte de démonstration exigé par Google Play (et par Apple le jour venu).
 *
 *   node scripts/seed-demo-account.mjs --password='…'                  # projet du .env (dev)
 *   node scripts/seed-demo-account.mjs --password='…' --project=<ref>  # production
 *
 * L'application exige une connexion : sans identifiants, le relecteur voit un
 * écran de login et rejette pour « impossible d'évaluer ». Un compte vide serait
 * accepté mais montrerait une application qui a l'air de ne rien faire — d'où
 * les deux comptes compagnons, la ligue et les pronostics scorés : le relecteur
 * ouvre l'app sur un classement peuplé.
 *
 * Idempotent : les trois comptes sont supprimés puis recréés à chaque exécution.
 * Tout le reste (profil, pronos, ligue, adhésions, classement) part avec eux par
 * cascade — voir supabase/functions/delete-account/index.ts pour la même logique.
 *
 * Le mot de passe n'est jamais écrit dans le dépôt : il est passé en argument et
 * se range dans un gestionnaire de mots de passe. La clé service_role n'est pas
 * demandée non plus, elle est lue via la CLI Supabase déjà authentifiée.
 */

import { execFileSync } from 'node:child_process';

import { devProjectRef } from './project-ref.mjs';

const COMPTES = [
    { email: 'demo@trycast.fr', username: 'DemoTryCast', principal: true },
    { email: 'demo.pote1@trycast.fr', username: 'Margot' },
    { email: 'demo.pote2@trycast.fr', username: 'Sacha' },
];

// Le code d'invitation suit le check de la table : 8 caractères dans un
// alphabet sans I, L, O, 0 ni 1 — les glyphes qu'on confond en les recopiant.
const LIGUE = { name: 'Les Potes du Samedi', invite_code: 'TRYCAST2', color: '#14432A' };

const arg = (nom) =>
    process.argv.find((a) => a.startsWith(`--${nom}=`))?.slice(nom.length + 3) ?? undefined;

const password = arg('password');
if (!password || password.length < 8) {
    console.error(
        "Mot de passe manquant.\n  node scripts/seed-demo-account.mjs --password='…'\n" +
            'Au moins 8 caractères. À conserver dans ton gestionnaire, pas dans le dépôt.',
    );
    process.exit(1);
}

const override = arg('project');
const ref = override || devProjectRef();
const URL = `https://${ref}.supabase.co`;

/** Clé service_role lue via la CLI plutôt que demandée à l'utilisateur. */
function serviceRoleKey() {
    try {
        const out = execFileSync(
            'supabase',
            ['projects', 'api-keys', '--project-ref', ref, '-o', 'json'],
            { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
        );
        const cle = JSON.parse(out).find((k) => k.name === 'service_role')?.api_key;
        if (!cle) throw new Error('service_role absente de la réponse');
        return cle;
    } catch (e) {
        console.error(
            `✗ Impossible de lire la clé service_role du projet ${ref}.\n` +
                "  Vérifie que la CLI Supabase est connectée (`supabase login`) et que le projet t'appartient.\n" +
                `  ${e.message}`,
        );
        process.exit(1);
    }
}

const KEY = serviceRoleKey();
const entetes = {
    apikey: KEY,
    Authorization: `Bearer ${KEY}`,
    'Content-Type': 'application/json',
};

async function api(chemin, options = {}) {
    const res = await fetch(`${URL}${chemin}`, {
        ...options,
        headers: { ...entetes, ...(options.headers ?? {}) },
    });
    const texte = await res.text();
    if (!res.ok) throw new Error(`${options.method ?? 'GET'} ${chemin} → ${res.status} ${texte}`);
    return texte ? JSON.parse(texte) : null;
}

const rest = (chemin, options) => api(`/rest/v1/${chemin}`, options);

async function nomDuProjet() {
    try {
        const out = execFileSync('supabase', ['projects', 'list', '-o', 'json'], {
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'ignore'],
        });
        return JSON.parse(out).find((p) => p.ref === ref)?.name ?? ref;
    } catch {
        return ref;
    }
}

console.log(`Cible : ${await nomDuProjet()} (${ref}) — ${override ? 'nommée explicitement' : 'déduite du .env'}\n`);

// ---------------------------------------------------------------------------
// 1) Table rase : on supprime les comptes de démo existants, la cascade fait le reste
// ---------------------------------------------------------------------------
const existants = await api('/auth/v1/admin/users?per_page=1000');
const aSupprimer = (existants.users ?? []).filter((u) =>
    COMPTES.some((c) => c.email === u.email),
);
for (const u of aSupprimer) {
    await api(`/auth/v1/admin/users/${u.id}`, { method: 'DELETE' });
}
console.log(`${aSupprimer.length} compte(s) de démo précédent(s) supprimé(s).`);

// ---------------------------------------------------------------------------
// 2) Création des comptes
//    L'API d'administration confirme l'adresse d'office : aucun e-mail n'est
//    envoyé, et elle accepte des adresses que l'inscription publique refuserait.
// ---------------------------------------------------------------------------
const crees = [];
for (const compte of COMPTES) {
    const u = await api('/auth/v1/admin/users', {
        method: 'POST',
        body: JSON.stringify({
            email: compte.email,
            password,
            email_confirm: true,
            user_metadata: { username: compte.username },
        }),
    });
    crees.push({ ...compte, id: u.id });
    console.log(`  ✓ ${compte.email} → ${compte.username}`);
}

// Le trigger de création de profil pose le pseudo depuis les métadonnées, mais
// pas username_chosen : sans lui, l'app renverrait le compte sur l'écran de
// choix du pseudo au lieu de l'accueil — le relecteur verrait un onboarding.
for (const c of crees) {
    await rest(`profiles?id=eq.${c.id}`, {
        method: 'PATCH',
        // is_demo : classé dans sa ligue (ce que voit le relecteur), absent du
        // classement général (où il concurrencerait de vrais joueurs).
        body: JSON.stringify({
            username: c.username,
            username_chosen: true,
            locale: 'fr',
            is_demo: true,
        }),
    });
}

// ---------------------------------------------------------------------------
// 3) Compétition et matchs à peupler
// ---------------------------------------------------------------------------
const [competition] = await rest(
    'competitions?is_active=eq.true&select=id,name,slug&order=starts_on.desc&limit=1',
);
if (!competition) {
    console.error('✗ Aucune compétition active : rien à pronostiquer. Joue seed-competitions.sql.');
    process.exit(1);
}

const matchs = await rest(
    `matches?competition_id=eq.${competition.id}&api_game_id=gt.0` +
        '&select=id,kickoff_at,status,home_score,away_score&order=kickoff_at.desc&limit=8',
);
if (matchs.length === 0) {
    console.error(
        `✗ Aucun match sur « ${competition.name} » : le relecteur verrait une app vide.\n` +
            '  Lance sync-fixtures sur ce projet avant de rejouer ce script.',
    );
    process.exit(1);
}
console.log(`\nCompétition : ${competition.name} — ${matchs.length} match(s) disponible(s).`);

// ---------------------------------------------------------------------------
// 4) Ligue + adhésions
// ---------------------------------------------------------------------------
const proprietaire = crees.find((c) => c.principal);
const [ligue] = await rest('leagues', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ ...LIGUE, owner_id: proprietaire.id, competition_id: competition.id }),
});
await rest('league_members', {
    method: 'POST',
    body: JSON.stringify(
        crees.map((c) => ({
            league_id: ligue.id,
            user_id: c.id,
            role: c.principal ? 'owner' : 'member',
        })),
    ),
});
console.log(`Ligue « ${ligue.name} » créée (code ${ligue.invite_code}), 3 membres.`);

// ---------------------------------------------------------------------------
// 5) Pronostics
//    Sur un match terminé on pose aussi les points : sans eux le classement
//    s'afficherait à zéro partout, ce qui donne l'impression que rien ne marche.
//    Valeurs fixes et plausibles — le vrai barème reste celui de la RPC.
// ---------------------------------------------------------------------------
// Verdict voulu pour chaque (match, joueur). Le pronostic est ensuite DÉRIVÉ du
// score réel du match, au lieu d'être fixé d'avance : sinon l'app affiche un
// badge « Score exact » au-dessus d'un pronostic qui ne correspond pas au score
// — incohérence visible sur une capture comme par le relecteur de Google.
// Un profil de réussite par joueur, le compte de démonstration devant : la
// capture du podium le montre en tête, avec l'étoile.
const VERDICTS = [
    ['exact', 'bon', 'exact', 'bon', 'bon', 'exact'], // DemoTryCast
    ['bon', 'bon', 'rate', 'exact', 'bon', 'bon'], // Margot
    ['bon', 'rate', 'bon', 'bon', 'rate', 'exact'], // Sacha
];

/** Pronostic et points cohérents avec le score réellement affiché. */
function prononcer(verdict, dom, ext) {
    if (verdict === 'exact') {
        return { h: dom, a: ext, pts: 18 + Math.min(dom, 20), winner: true, exactPts: 12 };
    }
    if (verdict === 'bon') {
        // Même vainqueur, écart différent : bon 1/N/2 sans score exact.
        const ecart = dom > ext ? 4 : -4;
        return { h: dom + ecart, a: ext, pts: 8, winner: true, exactPts: 0 };
    }
    // Vainqueur inversé : aucun point, comme le prévoit le barème.
    return { h: ext, a: dom, pts: 0, winner: false, exactPts: 0 };
}

let poses = 0;
const cumul = new Map(crees.map((c) => [c.id, { points: 0, scored: 0, exacts: 0 }]));

for (const [i, m] of matchs.entries()) {
    const termine = m.status === 'finished' && m.home_score !== null && m.away_score !== null;
    for (const [j, c] of crees.entries()) {
        const prono = { user_id: c.id, match_id: m.id, predicted_bonus_off_away: false };

        if (termine) {
            const v = prononcer(VERDICTS[j][i % VERDICTS[j].length], m.home_score, m.away_score);
            prono.predicted_home_score = Math.max(0, v.h);
            prono.predicted_away_score = Math.max(0, v.a);
            prono.predicted_bonus_off_home = v.exactPts > 0;
            prono.points_awarded = v.pts;
            prono.scored_at = new Date().toISOString();
            prono.points_breakdown = { winnerCorrect: v.winner, exactScorePoints: v.exactPts };
            const t = cumul.get(c.id);
            t.points += v.pts;
            t.scored += 1;
            if (v.exactPts > 0) t.exacts += 1;
        } else {
            // Match à venir : un pronostic plausible, sans points.
            prono.predicted_home_score = 20 + ((i + j) % 12);
            prono.predicted_away_score = 12 + ((i * 2 + j) % 10);
            prono.predicted_bonus_off_home = (i + j) % 3 === 0;
        }

        await rest('predictions', { method: 'POST', body: JSON.stringify(prono) });
        poses += 1;
    }
}
console.log(`${poses} pronostics posés.`);

// ---------------------------------------------------------------------------
// 6) Classement général — table agrégée, pas recalculée par une simple insertion
// ---------------------------------------------------------------------------
await rest('standings', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates' },
    body: JSON.stringify(
        crees.map((c) => ({
            user_id: c.id,
            competition_id: competition.id,
            total_points: cumul.get(c.id).points,
            predictions_scored: cumul.get(c.id).scored,
            exact_scores: cumul.get(c.id).exacts,
        })),
    ),
});

const classement = [...cumul.entries()]
    .map(([id, t]) => ({ nom: crees.find((c) => c.id === id).username, ...t }))
    .sort((a, b) => b.points - a.points);

console.log('\nClassement de démonstration :');
for (const [i, l] of classement.entries()) {
    console.log(`  ${i + 1}. ${l.nom.padEnd(12)} ${String(l.points).padStart(3)} pts`);
}

console.log(`
──────────────────────────────────────────────
À coller dans Play Console → Accès à l'application

  Identifiant : ${proprietaire.email}
  Mot de passe : (celui que tu viens de passer)

Instructions pour le relecteur :

  Connexion par e-mail et mot de passe avec les identifiants fournis. Le bouton
  « Continuer avec Google » est une alternative et n'est pas nécessaire pour
  évaluer l'application.

  Les pronostics se saisissent depuis l'onglet Matchs, en tapant un score sur
  une carte de match à venir. Le classement est dans l'onglet Classement.
  Aucune mise ni paiement n'intervient à aucune étape.
──────────────────────────────────────────────`);
