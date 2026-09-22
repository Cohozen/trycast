#!/usr/bin/env node
/**
 * Jeu de données de démonstration du projet DEV : de faux joueurs qui jouent
 * vraiment, pour les passes visuelles, les parcours de test et les captures
 * des stores.
 *
 *   node scripts/seed-demo.mjs           # purge puis sème (rejouable)
 *   node scripts/seed-demo.mjs --purge   # retire tout
 *
 * Contrairement aux comptes du relecteur Play (seed-demo-account.mjs, is_demo),
 * ces joueurs sont des joueurs ordinaires : ils figurent au classement général.
 *
 * Le scénario est posé sur nc-2026 :
 *   - J1-J3 : les vrais matchs de juillet (vrais scores, vrais essais) ;
 *   - J4-J5 : des matchs fictifs calés sur l'heure d'exécution (terminé, bonus
 *     offensif en attente, en direct, coup d'envoi dans 45 min, reporté,
 *     annulé…). D'où la règle : REJOUER JUSTE AVANT chaque session.
 *
 * Les points ne sont pas posés à la main : le script appelle buildScoringPayload
 * (le code de l'EF sync-results) puis la RPC apply_match_scores. Points, détail,
 * joker et classements sont ceux que la prod calculerait.
 *
 * Les pronos sont tirés par un PRNG à graine fixe selon le style de chaque
 * joueur : deux exécutions donnent les mêmes données, seules les dates glissent.
 * Les cas qui doivent tomber juste (coup de la journée, joker) sont écrits en dur
 * dans SCENARIOS.
 *
 * ⚠️ DÉVELOPPEMENT UNIQUEMENT : le ref vient du `.env`, aucune option ne vise un
 * autre projet. Mot de passe commun des joueurs : celui des users e2e.
 */

import { execFileSync } from 'node:child_process';

import {
    buildReminderMessage,
    buildResultMessage,
    buildRoundHighlightMessage,
    REMINDER_URL,
    RESULT_URL,
    roundHighlightUrl,
} from '../supabase/functions/_shared/notification-messages.ts';
import {
    buildScoringPayload,
    parseScoringRules,
} from '../supabase/functions/sync-results/transform.ts';
import { devProjectRef } from './project-ref.mjs';

const PASSWORD = 'motdepasse123';
const DOMAIN = 'demo.trycast.local';
const HERO = 'Hugo';

// Styles : « fin » trouve souvent le bon vainqueur et parfois le score exact,
// « cotes » suit le favori, « contre » joue l'outsider, « hasard » tire à pile ou face.
const JOUEURS = [
    ['Hugo', 'fin'],
    ['Margaux', 'fin'],
    ['Lucas_XV', 'cotes'],
    ['Ines', 'cotes'],
    ['Titou64', 'contre'],
    ['Bastoune', 'hasard'],
    ['Camille', 'cotes'],
    ['Troisieme_Ligne_Aile', 'cotes'], // 20 caractères : le maximum, pour la troncature
    ['Yanis', 'hasard'],
    ['Chloe', 'fin'],
    ['Pilou', 'contre'],
    ['Maelle', 'cotes'],
    ['Raph_Rugby', 'hasard'],
    ['Nono83', 'cotes'],
    ['Jojo_Bayonne', 'cotes'],
    ['Sarah', 'fin'],
];
// Arrivés après la J1 : leurs lignes de J1 s'affichent « — »
const TARDIFS = new Set(['Maelle', 'Raph_Rugby']);

const TOUS = JOUEURS.map(([p]) => p);
const LIGUES = [
    {
        cle: 'vitrine',
        name: 'Les Potes du Samedi',
        invite_code: 'RUGBY226',
        color: '#14432A',
        owner: 'Margaux',
        membres: TOUS.slice(0, 12),
    },
    {
        cle: 'bureau',
        name: 'Open space du 3e',
        invite_code: 'BUREAU26',
        color: '#2A6FDB',
        owner: HERO,
        membres: [HERO, 'Lucas_XV', 'Ines', 'Nono83', 'Jojo_Bayonne', 'Sarah'],
    },
    {
        cle: 'duo',
        name: 'Le duo du dimanche',
        invite_code: 'DUETTE28',
        color: '#E0952A',
        owner: 'Sarah',
        membres: ['Sarah', HERO],
    },
    {
        cle: 'solo',
        name: 'Ma ligue perso',
        invite_code: 'SEVENS29',
        color: '#7A4F9E',
        owner: HERO,
        membres: [HERO],
    },
    {
        // Le héros n'en est pas : le code sert au parcours « Rejoindre »
        cle: 'a-rejoindre',
        name: 'Les Crampons Libres',
        invite_code: 'RUCKXV26',
        color: '#1F8A6B',
        owner: 'Chloe',
        membres: ['Chloe', 'Raph_Rugby', 'Nono83', 'Jojo_Bayonne', 'Sarah'],
    },
];

// Matchs fictifs, décalage en minutes par rapport à T. Affiches reprises du
// calendrier de novembre. Plage -8001..-8099 réservée à ce script.
const H = 60;
const J = 24 * H;
const MATCHS_FICTIFS = [
    {
        id: -8001,
        round: '4',
        dom: 'IRL',
        ext: 'ARG',
        dans: -27 * H,
        cotes: [1.35, 22, 3.4],
        statut: 'finished',
        score: [27, 20],
        essais: [3, 2],
    },
    // Essais absents : le bonus offensif coché reste « en attente »
    {
        id: -8002,
        round: '4',
        dom: 'ITA',
        ext: 'RSA',
        dans: -24 * H,
        cotes: [6.5, 26, 1.14],
        statut: 'finished',
        score: [13, 33],
        essais: null,
    },
    {
        id: -8003,
        round: '4',
        dom: 'SCO',
        ext: 'NZL',
        dans: -50,
        cotes: [3.8, 24, 1.27],
        statut: 'in_play',
        live: [14, 17, 'Second Half'],
        sauf: ['Bastoune', 'Yanis'],
    },
    // Deadline imminente, sans prono du héros
    {
        id: -8004,
        round: '4',
        dom: 'WAL',
        ext: 'JPN',
        dans: 45,
        cotes: [1.45, 21, 2.75],
        sauf: [HERO, 'Pilou', 'Raph_Rugby'],
    },
    {
        id: -8005,
        round: '4',
        dom: 'FRA',
        ext: 'FIJ',
        dans: J,
        cotes: [1.18, 25, 5],
        seuls: [HERO, 'Margaux', 'Lucas_XV', 'Chloe', 'Sarah', 'Titou64'],
    },
    {
        id: -8006,
        round: '4',
        dom: 'ENG',
        ext: 'AUS',
        dans: 2 * J,
        cotes: [1.62, 23, 2.3],
        seuls: ['Margaux', 'Chloe', 'Ines'],
    },
    {
        id: -8011,
        round: '5',
        dom: 'FRA',
        ext: 'NZL',
        dans: 7 * J,
        cotes: [2.1, 21, 1.8],
        seuls: ['Margaux', 'Sarah'],
    },
    {
        id: -8012,
        round: '5',
        dom: 'ENG',
        ext: 'RSA',
        dans: 7 * J + 2 * H,
        cotes: [2.6, 22, 1.55],
        statut: 'postponed',
        seuls: [],
    },
    {
        id: -8013,
        round: '5',
        dom: 'IRL',
        ext: 'AUS',
        dans: 8 * J,
        cotes: [1.4, 23, 3.1],
        statut: 'cancelled',
        seuls: [],
    },
    {
        id: -8014,
        round: '5',
        dom: 'SCO',
        ext: 'ARG',
        dans: 8 * J + 2 * H,
        cotes: [1.9, 22, 2],
        seuls: ['Margaux', 'Sarah'],
    },
];

// Pronos écrits en dur : [dom, ext, bonus dom, bonus ext]. `autres: 'perdant'`
// fait donner le mauvais vainqueur à tous les autres joueurs.
const JPN_FRA = 45296110;
const RSA_SCO = 45293557;
const SCENARIOS = {
    // J3, « Le coup parfait » : Titou64 seul contre la ligue, score exact,
    // Japon outsider, joker posé
    [JPN_FRA]: { pronos: { Titou64: [24, 21] }, autres: 'perdant' },
    // J2, « Deux à contre-courant » : le héros et Margaux ex æquo (même
    // vainqueur, même volet d'écart proche), variante « moi » pour le héros
    [RSA_SCO]: { pronos: { [HERO]: [27, 20], Margaux: [25, 19] }, autres: 'perdant' },
    // Bonus offensif coché sur un match sans essais : « en attente » chez le héros
    [-8002]: { pronos: { [HERO]: [12, 35, false, true], Chloe: [10, 38, false, true] } },
};

// Jokers : joueur → api_game_id. Les autres en reçoivent un au hasard en juillet.
const JOKERS = { Titou64: [JPN_FRA], [HERO]: [-8005], Margaux: [-8001], Lucas_XV: [-8003] };

// [api_game_id, cible, réaction, auteurs] — ligue vitrine
const REACTIONS = [
    [JPN_FRA, 'Titou64', 'bravo', ['Margaux', 'Lucas_XV', 'Ines', 'Chloe', 'Camille']],
    [JPN_FRA, 'Titou64', 'bold', [HERO, 'Yanis', 'Maelle']],
    [JPN_FRA, 'Titou64', 'lucky', ['Pilou', 'Bastoune']],
    [RSA_SCO, HERO, 'bravo', ['Margaux', 'Lucas_XV', 'Chloe']],
    [RSA_SCO, HERO, 'laugh', ['Bastoune']],
    [RSA_SCO, 'Margaux', 'bravo', [HERO, 'Chloe']],
    [-8001, 'Margaux', 'bravo', [HERO, 'Ines']],
    [-8001, 'Bastoune', 'laugh', ['Pilou', HERO]],
];

// Niveau des nations, pour habiller de cotes les matchs de juillet qui n'en ont
// pas (le fournisseur n'en donnait pas) : sans cotes, le barème prend 2,0 partout.
const NIVEAU = {
    NZL: 92,
    RSA: 92,
    IRL: 89,
    FRA: 89,
    ENG: 85,
    ARG: 82,
    SCO: 81,
    AUS: 79,
    FIJ: 76,
    WAL: 72,
    ITA: 72,
    JPN: 70,
};

const LEGACY_EMAILS = ['demo@trycast.fr', 'demo.pote1@trycast.fr', 'demo.pote2@trycast.fr'];
const LEGACY_LIGUES = ['TRYCAST2', 'DEMERCT2'];
// Plages de matchs fictifs : ce script, puis seed-upcoming-matches.sql et
// seed-screenshot-matches.mjs, qu'il remplace, et les matchs de
// seed-test-notifications.sql — leur journée « Test notifications » s'affiche
// dans la frise des journées. Ce seed se rejoue juste avant un test de push.
const PLAGES = [
    [-8099, -8001],
    [-706, -701],
    [-9006, -9001],
    [-602, -601],
];

// ---------------------------------------------------------------------------

const purge = process.argv.includes('--purge');
if (process.argv.some((a) => a.startsWith('--project'))) {
    console.error(
        "✗ Ce script ne vise que le projet du .env (développement). Pas d'option pour le forcer.",
    );
    process.exit(1);
}
const ref = devProjectRef();
const URL = `https://${ref}.supabase.co`;

const KEY = (() => {
    const out = execFileSync(
        'supabase',
        ['projects', 'api-keys', '--project-ref', ref, '-o', 'json'],
        {
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'ignore'],
        },
    );
    return JSON.parse(out).find((k) => k.name === 'service_role').api_key;
})();
const entetes = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };

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
const post = (table, rows, prefer = 'return=minimal') =>
    rest(table, { method: 'POST', headers: { Prefer: prefer }, body: JSON.stringify(rows) });
const rpc = (fn, args) => rest(`rpc/${fn}`, { method: 'POST', body: JSON.stringify(args) });

/** PRNG mulberry32, graine dérivée du texte : chaque (joueur, match) a son tirage. */
function tirage(graine) {
    let a = [...graine].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619), 2166136261);
    return () => {
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
const entre = (rnd, min, max) => min + Math.floor(rnd() * (max - min + 1));

// ---------------------------------------------------------------------------
// 1) Purge
// ---------------------------------------------------------------------------
// Au rejeu, les comptes de démo sont CONSERVÉS et vidés de leurs données : les
// supprimer changerait leur id et déconnecterait tout appareil ouvert en Hugo.
// Seul --purge les supprime (la cascade emporte alors le reste).
const emailDe = (pseudo) => `${pseudo.toLowerCase()}@${DOMAIN}`;
const { users } = await api('/auth/v1/admin/users?per_page=1000');
const gardes = purge ? new Set() : new Set(JOUEURS.map(([p]) => emailDe(p)));
const aSupprimer = users.filter(
    (u) =>
        (u.email?.endsWith(`@${DOMAIN}`) && !gardes.has(u.email)) ||
        LEGACY_EMAILS.includes(u.email),
);
for (const u of aSupprimer) await api(`/auth/v1/admin/users/${u.id}`, { method: 'DELETE' });
const existants = users.filter((u) => gardes.has(u.email));
if (existants.length > 0) {
    const ids = `in.(${existants.map((u) => u.id).join(',')})`;
    // Ligues possédées d'abord : la cascade emporte adhésions, réactions et notifications de ligue
    for (const chemin of [
        `leagues?owner_id=${ids}`,
        `league_members?user_id=${ids}`,
        `prediction_reactions?reactor_id=${ids}`,
        `notification_sends?user_id=${ids}`,
        `phase_jokers?user_id=${ids}`,
        `predictions?user_id=${ids}`,
        `standings?user_id=${ids}`,
    ]) {
        await rest(chemin, { method: 'DELETE' });
    }
}
await rest(`leagues?invite_code=in.(${LEGACY_LIGUES.join(',')})`, { method: 'DELETE' });
const plages = PLAGES.map(([a, b]) => `and(api_game_id.gte.${a},api_game_id.lte.${b})`).join(',');
await rest(`matches?or=(${plages})`, { method: 'DELETE' });
await rest('competition_phases?key=eq.demo_gap', { method: 'DELETE' });
console.log(
    `Purge : ${aSupprimer.length} compte(s) supprimé(s), ${existants.length} vidé(s), matchs fictifs et phase demo_gap retirés.`,
);
if (purge) process.exit(0);

// ---------------------------------------------------------------------------
// 2) Compétition, garde et phase de joker
// ---------------------------------------------------------------------------
const T = Math.floor(Date.now() / 300_000) * 300_000; // arrondi à 5 min : coups d'envoi crédibles
const iso = (minutes) => new Date(T + minutes * 60_000).toISOString();

const [competition] = await rest('competitions?slug=eq.nc-2026&select=id,name');
if (!competition) {
    console.error('✗ Compétition nc-2026 absente. Joue scripts/seed-competitions.sql.');
    process.exit(1);
}
const C = competition.id;

const reels = await rest(
    `matches?competition_id=eq.${C}&api_game_id=gt.0&kickoff_at=gte.${iso(-2 * J)}&kickoff_at=lte.${iso(9 * J)}&select=id`,
);
if (reels.length > 0) {
    console.error(
        `✗ ${reels.length} vrai(s) match(s) de nc-2026 dans la fenêtre du scénario (T−2 j..T+9 j) :\n` +
            '  les journées fictives doublonneraient le calendrier réel. Décaler le scénario avant de semer.',
    );
    process.exit(1);
}

// Le joker n'existe que dans une phase. Hors de toute phase (l'intersaison de
// septembre), une phase temporaire comble le trou entre les deux voisines.
const phases = await rest(
    `competition_phases?competition_id=eq.${C}&select=id,key,starts_at,ends_at`,
);
const dansPhase = (quand) =>
    phases.find((p) => new Date(p.starts_at) <= quand && quand < new Date(p.ends_at));
if (!dansPhase(new Date(T))) {
    const avant = phases.map((p) => new Date(p.ends_at)).filter((d) => d <= new Date(T));
    const apres = phases.map((p) => new Date(p.starts_at)).filter((d) => d > new Date(T));
    // ponytail: une seule phase de comblement ; si T+8 j déborde sur la phase suivante, ces matchs y tombent
    const [gap] = await post(
        'competition_phases',
        {
            competition_id: C,
            key: 'demo_gap',
            name: 'Fenêtre de démo',
            starts_at: avant.length ? new Date(Math.max(...avant)).toISOString() : iso(-30 * J),
            ends_at: apres.length ? new Date(Math.min(...apres)).toISOString() : iso(30 * J),
            sort: 99,
        },
        'return=representation',
    );
    phases.push(gap);
}

// ---------------------------------------------------------------------------
// 3) Joueurs
// ---------------------------------------------------------------------------
const id = Object.fromEntries(
    existants.map((u) => [JOUEURS.find(([p]) => emailDe(p) === u.email)[0], u.id]),
);
for (const [pseudo] of JOUEURS.filter(([p]) => !id[p])) {
    const u = await api('/auth/v1/admin/users', {
        method: 'POST',
        body: JSON.stringify({
            email: emailDe(pseudo),
            password: PASSWORD,
            email_confirm: true,
            user_metadata: { username: pseudo },
        }),
    });
    id[pseudo] = u.id;
}
await rest(`profiles?id=in.(${Object.values(id).join(',')})`, {
    method: 'PATCH',
    body: JSON.stringify({ username_chosen: true, locale: 'fr', is_demo: false }),
});
console.log(`${JOUEURS.length} joueurs prêts (mot de passe ${PASSWORD}).`);

// ---------------------------------------------------------------------------
// 4) Matchs
// ---------------------------------------------------------------------------
const equipes = Object.fromEntries((await rest('teams?select=id,code')).map((t) => [t.code, t.id]));
await post(
    'matches',
    MATCHS_FICTIFS.map((m) => ({
        api_game_id: m.id,
        competition_id: C,
        home_team_id: equipes[m.dom],
        away_team_id: equipes[m.ext],
        kickoff_at: iso(m.dans),
        round: m.round,
        status: m.statut ?? 'scheduled',
        odds_home: m.cotes[0],
        odds_draw: m.cotes[1],
        odds_away: m.cotes[2],
        odds_source: 'default',
        odds_captured_at: iso(m.dans - 2 * J),
        home_score: m.score?.[0] ?? null,
        away_score: m.score?.[1] ?? null,
        home_tries: m.essais?.[0] ?? null,
        away_tries: m.essais?.[1] ?? null,
        live_home_score: m.live?.[0] ?? null,
        live_away_score: m.live?.[1] ?? null,
        live_period: m.live?.[2] ?? null,
        live_updated_at: m.live ? iso(0) : null,
    })),
);

const SELECT_MATCH =
    'id,api_game_id,round,kickoff_at,status,home_score,away_score,home_tries,away_tries,odds_home,odds_draw,odds_away,' +
    'home:teams!matches_home_team_id_fkey(code,name),away:teams!matches_away_team_id_fkey(code,name)';
const matchs = await rest(
    `matches?competition_id=eq.${C}&or=(round.in.(1,2,3),and(api_game_id.gte.-8099,api_game_id.lte.-8001))` +
        `&select=${SELECT_MATCH}&order=kickoff_at`,
);

// Sur le dev, les matchs de juillet ont été marqués needs_review par la borne
// de 48 h de sync-results avant d'être complétés à la main. Ils sont terminés,
// score et essais saisis : on lève le drapeau comme le ferait un admin, sans
// quoi apply_match_scores refuse de les scorer.
await rest(
    `matches?competition_id=eq.${C}&round=in.(1,2,3)&status=eq.finished&needs_review=is.true`,
    {
        method: 'PATCH',
        body: JSON.stringify({ needs_review: false }),
    },
);

// Cotes plausibles sur les matchs de juillet qui n'en ont pas
for (const m of matchs.filter((x) => x.odds_home === null)) {
    const p = 1 / (1 + 10 ** (-(NIVEAU[m.home.code] + 3 - NIVEAU[m.away.code]) / 30));
    const cote = (x) => Math.max(1.05, Math.round((0.93 / x) * 100) / 100);
    Object.assign(m, { odds_home: cote(p), odds_draw: 22, odds_away: cote(1 - p) });
    await rest(`matches?id=eq.${m.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
            odds_home: m.odds_home,
            odds_draw: 22,
            odds_away: m.odds_away,
            odds_source: 'default',
        }),
    });
}
const parApi = Object.fromEntries(matchs.map((m) => [m.api_game_id, m]));
const reelles = matchs.filter((m) => m.api_game_id > 0);
if (reelles.length !== 18 || !parApi[JPN_FRA] || !parApi[RSA_SCO]) {
    console.error(
        `✗ ${reelles.length} match(s) de juillet trouvés sur 18 attendus : lance sync-fixtures.`,
    );
    process.exit(1);
}

// ---------------------------------------------------------------------------
// 5) Pronostics
// ---------------------------------------------------------------------------
const signe = (x) => Math.sign(x) || 1; // pas de nul prédit : rare en rugby, et sans intérêt ici

/** Prono [dom, ext, bonus dom, bonus ext] d'un joueur, pour une issue voulue (+1 domicile, −1 extérieur). */
function prononcer(rnd, issue, reel) {
    if (reel && signe(reel[0] - reel[1]) === issue && rnd() < 0.15)
        return [reel[0], reel[1], false, false];
    const gagnant = entre(rnd, 18, 36);
    const perdant = Math.max(0, gagnant - entre(rnd, 3, 18));
    const bonus = gagnant >= 30 && rnd() < 0.5;
    return issue > 0 ? [gagnant, perdant, bonus, false] : [perdant, gagnant, false, bonus];
}

function issueChoisie(rnd, style, m) {
    const favori = Number(m.odds_home) <= Number(m.odds_away) ? 1 : -1;
    const reelle = m.home_score !== null ? signe(m.home_score - m.away_score) : null;
    if (style === 'fin' && reelle !== null) return rnd() < 0.8 ? reelle : -reelle;
    if (style === 'cotes') return rnd() < 0.85 ? favori : -favori;
    if (style === 'contre') return rnd() < 0.6 ? -favori : favori;
    return rnd() < 0.5 ? 1 : -1;
}

const fictif = Object.fromEntries(MATCHS_FICTIFS.map((m) => [m.id, m]));
const vitrine = new Set(LIGUES[0].membres);
const pronos = [];
for (const m of matchs) {
    const f = fictif[m.api_game_id];
    const scenario = SCENARIOS[m.api_game_id];
    const reel = m.home_score !== null ? [m.home_score, m.away_score] : null;
    const joueurs = JOUEURS.filter(([p]) => {
        if (m.round === '1' && TARDIFS.has(p)) return false;
        if (f?.seuls) return f.seuls.includes(p);
        return !f?.sauf?.includes(p);
    });
    const lignes = joueurs.map(([p, style]) => {
        const rnd = tirage(`${p}:${m.api_game_id}`);
        let prono = scenario?.pronos[p];
        if (!prono && scenario?.autres === 'perdant')
            prono = prononcer(rnd, -signe(reel[0] - reel[1]), null);
        prono ??= prononcer(rnd, issueChoisie(rnd, style, m), reel);
        return { p, rnd, prono };
    });

    // Hors scénario, la majorité de la vitrine trouve le bon vainqueur : sinon un
    // coup de la journée imprévu viendrait concurrencer ceux de SCENARIOS
    if (reel && !scenario) {
        const issue = signe(reel[0] - reel[1]);
        const juste = (l) => signe(l.prono[0] - l.prono[1]) === issue;
        const membres = lignes.filter((l) => vitrine.has(l.p));
        for (const l of membres.filter((x) => !juste(x))) {
            if (2 * membres.filter(juste).length >= membres.length) break;
            l.prono = prononcer(l.rnd, issue, reel);
        }
    }

    for (const { p, prono } of lignes) {
        pronos.push({
            user_id: id[p],
            match_id: m.id,
            predicted_home_score: prono[0],
            predicted_away_score: prono[1],
            predicted_bonus_off_home: prono[2] ?? false,
            predicted_bonus_off_away: prono[3] ?? false,
        });
    }
}
await post('predictions', pronos);
console.log(`${pronos.length} pronostics posés.`);

// Jokers : ceux de JOKERS, plus un au hasard en juillet pour deux joueurs sur trois
const jokers = [];
const phaseDe = (m) => dansPhase(new Date(m.kickoff_at));
for (const [p] of JOUEURS) {
    const choisis = (JOKERS[p] ?? []).map((a) => parApi[a]);
    if (!choisis.some((m) => m.api_game_id > 0) && tirage(`joker:${p}`)() < 0.66) {
        const candidats = reelles.filter(
            (m) =>
                !SCENARIOS[m.api_game_id] &&
                pronos.some((x) => x.user_id === id[p] && x.match_id === m.id),
        );
        choisis.push(candidats[entre(tirage(`joker-match:${p}`), 0, candidats.length - 1)]);
    }
    for (const m of choisis)
        jokers.push({ user_id: id[p], phase_id: phaseDe(m).id, match_id: m.id });
}
await post('phase_jokers', jokers);

// ---------------------------------------------------------------------------
// 6) Scoring par le vrai pipeline (buildScoringPayload + apply_match_scores)
// ---------------------------------------------------------------------------
const [regle] = await rest('scoring_rules?is_active=eq.true&select=version,rules');
const bareme = parseScoringRules(regle.rules);
const termines = matchs.filter((m) => m.status === 'finished' && m.home_score !== null);
for (const m of termines) {
    const lignes = await rest(
        `predictions?match_id=eq.${m.id}&select=id,user_id,predicted_home_score,predicted_away_score,predicted_bonus_off_home,predicted_bonus_off_away`,
    );
    const avecJoker = await rest(`phase_jokers?match_id=eq.${m.id}&select=user_id`);
    await rpc('apply_match_scores', {
        p_match_id: m.id,
        p_rule_version: regle.version,
        p_predictions: buildScoringPayload(
            m,
            lignes,
            bareme,
            new Set(avecJoker.map((j) => j.user_id)),
        ),
    });
}
console.log(`${termines.length} matchs scorés (barème v${regle.version}).`);

// ---------------------------------------------------------------------------
// 7) Ligues, réactions, notifications
// ---------------------------------------------------------------------------
const ligues = {};
for (const l of LIGUES) {
    const [ligue] = await post(
        'leagues',
        {
            name: l.name,
            invite_code: l.invite_code,
            color: l.color,
            owner_id: id[l.owner],
            competition_id: C,
            created_at: '2026-06-27T18:00:00Z',
        },
        'return=representation',
    );
    ligues[l.cle] = ligue;
    await post(
        'league_members',
        l.membres.map((p) => ({
            league_id: ligue.id,
            user_id: id[p],
            role: p === l.owner ? 'owner' : 'member',
            joined_at: TARDIFS.has(p) ? '2026-07-08T19:00:00Z' : '2026-06-28T10:00:00Z',
        })),
    );
}

await post(
    'prediction_reactions',
    REACTIONS.flatMap(([api, cible, reaction, auteurs]) =>
        auteurs.map((a) => ({
            league_id: ligues.vitrine.id,
            match_id: parApi[api].id,
            target_user_id: id[cible],
            reactor_id: id[a],
            reaction,
        })),
    ),
);

// Boîte de réception du héros, textes produits par le module de l'EF notify
const pointsDuHeros = Object.fromEntries(
    (await rest(`predictions?user_id=eq.${id[HERO]}&select=match_id,points_awarded`)).map((x) => [
        x.match_id,
        x.points_awarded,
    ]),
);
const equipesDe = (m) => ({ home: m.home, away: m.away });
const resultat = (m) => ({
    ...buildResultMessage('fr', {
        ...equipesDe(m),
        homeScore: m.home_score,
        awayScore: m.away_score,
        points: pointsDuHeros[m.id] ?? 0,
    }),
    url: RESULT_URL,
});
const plusTard = (m, heures) =>
    new Date(new Date(m.kickoff_at).getTime() + heures * 3_600_000).toISOString();
const meilleurJ3 = reelles
    .filter((m) => m.round === '3')
    .sort((a, b) => (pointsDuHeros[b.id] ?? 0) - (pointsDuHeros[a.id] ?? 0))[0];
const ancreJ2 = reelles.filter((m) => m.round === '2').at(-1);
const notif = (m, type, contenu, creee, lue, league_id = null) => ({
    user_id: id[HERO],
    match_id: m.id,
    type,
    status: 'sent',
    league_id,
    created_at: creee,
    read_at: lue ? creee : null,
    ...contenu,
});
await post('notification_sends', [
    notif(
        parApi[-8004],
        'reminder',
        { ...buildReminderMessage('fr', equipesDe(parApi[-8004])), url: REMINDER_URL },
        iso(-10),
        false,
    ),
    notif(parApi[-8001], 'result', resultat(parApi[-8001]), plusTard(parApi[-8001], 2), false),
    notif(
        ancreJ2,
        'round_highlight',
        {
            ...buildRoundHighlightMessage('fr', {
                leagueName: ligues.vitrine.name,
                isLaureate: true,
            }),
            url: roundHighlightUrl(ligues.vitrine.id, '2'),
        },
        plusTard(ancreJ2, 3),
        true,
        ligues.vitrine.id,
    ),
    notif(meilleurJ3, 'result', resultat(meilleurJ3), plusTard(meilleurJ3, 2), true),
]);

// ---------------------------------------------------------------------------
// 8) Récapitulatif : contrôles et index des cas
// ---------------------------------------------------------------------------
const general = await rpc('get_global_leaderboard', { p_competition_id: C, p_limit: 10 });
console.log('\nClassement général (top 10) :');
for (const l of general)
    console.log(`  ${String(l.rank).padStart(2)}. ${l.username.padEnd(20)} ${l.total_points} pts`);

const coups = await rpc('league_round_highlights', { p_league_id: ligues.vitrine.id });
console.log(`\nCoups de la journée — ${ligues.vitrine.name} :`);
for (const c of coups) console.log(`  J${c.round_key} ${c.username} ${c.points} pts`);
const attendus = { 2: [HERO, 'Margaux'], 3: ['Titou64'] };
const ecart = Object.entries(attendus).filter(
    ([j, noms]) =>
        coups
            .filter((c) => c.round_key === j)
            .map((c) => c.username)
            .sort()
            .join() !== [...noms].sort().join(),
);
if (ecart.length > 0 || coups.some((c) => !(c.round_key in attendus))) {
    console.error(
        '✗ Coups de la journée inattendus : le tirage ou le barème a changé, revoir SCENARIOS.',
    );
    process.exitCode = 1;
}

const lien = (chemin) => `trycast://${chemin}`;
console.log(`
Héros : ${HERO.toLowerCase()}@${DOMAIN} / ${PASSWORD}

Cas couverts :
  En direct (SCO–NZL)               ${lien(`match/${parApi[-8003].id}`)}
  Coup d'envoi dans 45 min, sans prono ${lien(`match/${parApi[-8004].id}`)}
  Joker posé, à venir (FRA–FIJ)     ${lien(`match/${parApi[-8005].id}`)}
  Terminé, réactions (IRL–ARG)      ${lien(`match/${parApi[-8001].id}`)}
  Bonus offensif en attente (ITA–RSA) ${lien(`match/${parApi[-8002].id}`)}
  Coup parfait J3 (JPN–FRA)         ${lien(`match/${parApi[JPN_FRA].id}`)}
  Ligue vitrine, J3                 ${lien(`league/${ligues.vitrine.id}?tab=results&round=3`)}
  Ligue vitrine, J2 (héros ex æquo) ${lien(`league/${ligues.vitrine.id}?tab=results&round=2`)}
  Ligue du bureau (propriétaire)    ${lien(`league/${ligues.bureau.id}`)}
  Duo / Solo                        ${lien(`league/${ligues.duo.id}`)}  ${lien(`league/${ligues.solo.id}`)}
  Rejoindre avec un code            ${lien(`league/new?tab=join&code=${ligues['a-rejoindre'].invite_code}`)}
  Profil d'un joueur (Titou64)      ${lien(`player/${id.Titou64}`)}
  Notifications (2 non lues)        ${lien('notifications')}

Rejouer avant chaque session : les dates sont calées sur maintenant.`);
