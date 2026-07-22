#!/usr/bin/env node
/**
 * Pousse UNIQUEMENT la configuration e-mail du projet dev, via l'API Management.
 *
 *   SUPABASE_ACCESS_TOKEN='sbp_...' node scripts/push-email-config.mjs [--dry-run]
 *
 * Pourquoi pas `supabase config push` : cette commande pousse **toute** la
 * configuration du projet, n'a aucun mode dry-run, et échoue de toute façon
 * aujourd'hui en lisant la config Storage distante
 * (`SchemaError(Missing key at ["databasePoolMode"])`, décalage CLI/plateforme).
 * Ici on n'envoie que les champs listés dans `payload()` : sujets, contenus HTML,
 * longueur du code OTP, activation des 2 notifications de sécurité. Le SMTP, les
 * rate limits, les URLs de redirection et le reste du `[auth]` ne sont pas touchés
 * — ils sont déjà corrects en ligne (cf. supabase/config.toml, aligné le 2026-07-21).
 *
 * `--dry-run` affiche le diff avant/après sans rien écrire.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { OUT_DIR, TEMPLATES } from './build-email-templates.mjs';

const PROJECT_REF = 'bmdzadvugtkclnqjpndr'; // trycast-dev
const API = `https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth`;

const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!token) {
    console.error(
        "SUPABASE_ACCESS_TOKEN manquant.\nCrée un token sur https://supabase.com/dashboard/account/tokens puis :\n  export SUPABASE_ACCESS_TOKEN='sbp_...'",
    );
    process.exit(1);
}

const dryRun = process.argv.includes('--dry-run');

/** Champs GoTrue à écrire, dérivés des templates générés. */
function payload() {
    const body = {
        // L'app et le template `recovery` attendent un code à 6 chiffres.
        mailer_otp_length: 6,
    };
    for (const { key, subject, file } of TEMPLATES) {
        body[`mailer_subjects_${key}`] = subject;
        body[`mailer_templates_${key}_content`] = readFileSync(join(OUT_DIR, file), 'utf8');
        // Les notifications de sécurité ne partent que si elles sont activées.
        if (key.endsWith('_notification')) {
            body[`mailer_notifications_${key.replace('_notification', '')}_enabled`] = true;
        }
    }
    return body;
}

async function getConfig() {
    const res = await fetch(API, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error(`GET ${res.status} ${await res.text()}`);
    return res.json();
}

const short = (v) =>
    typeof v === 'string' && v.length > 60 ? `${v.slice(0, 57).replace(/\n/g, ' ')}…` : String(v);

const before = await getConfig();
const body = payload();

console.log(`Projet ${PROJECT_REF} — ${Object.keys(body).length} champs :\n`);
let changes = 0;
for (const [k, v] of Object.entries(body)) {
    if (before[k] === v) {
        console.log(`  = ${k}`);
        continue;
    }
    changes += 1;
    console.log(`  ~ ${k}\n      avant : ${short(before[k])}\n      après : ${short(v)}`);
}

if (changes === 0) {
    console.log('\nRien à pousser, la config en ligne est déjà à jour.');
    process.exit(0);
}
if (dryRun) {
    console.log(`\n--dry-run : ${changes} champ(s) seraient modifiés, rien n'a été écrit.`);
    process.exit(0);
}

const res = await fetch(API, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
});
if (!res.ok) {
    console.error(`\n✗ PATCH ${res.status}\n${await res.text()}`);
    process.exit(1);
}

// Relecture : on ne se fie pas au code retour, on vérifie ce qui est réellement en ligne.
const after = await getConfig();
const notApplied = Object.entries(body).filter(([k, v]) => after[k] !== v);
if (notApplied.length > 0) {
    console.error(`\n✗ ${notApplied.length} champ(s) non appliqués :`);
    for (const [k] of notApplied) console.error(`    ${k}`);
    process.exit(1);
}
console.log(`\n✓ ${changes} champ(s) poussés et relus en ligne.`);
