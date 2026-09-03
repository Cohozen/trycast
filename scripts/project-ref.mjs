/**
 * Ref du projet Supabase visé par les scripts, déduit du `.env` local.
 *
 * Le projet est passé à deux bases (Lot 9) : celle d'origine est devenue la
 * **production**, une nouvelle porte le **développement**. Écrire un ref en dur
 * dans un script, c'est risquer de viser la prod par distraction — d'où cette
 * source unique : `EXPO_PUBLIC_SUPABASE_URL` du `.env`, qui est déjà ce que
 * l'app utilise en local et pointe donc toujours sur le projet de dev.
 *
 * Aucune dépendance : le `.env` est lu à la main plutôt que d'ajouter dotenv
 * pour trois lignes, et seule la clé recherchée est extraite (pas d'injection
 * dans process.env, rien d'autre du fichier n'est interprété).
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ENV_PATH = join(dirname(dirname(fileURLToPath(import.meta.url))), '.env');

/** Valeur d'une clé du `.env`, sans guillemets ni espaces superflus. */
function readEnv(key) {
    let content;
    try {
        content = readFileSync(ENV_PATH, 'utf8');
    } catch {
        throw new Error(`.env introuvable (${ENV_PATH}) — copie .env.example et renseigne-le.`);
    }
    for (const line of content.split('\n')) {
        const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
        if (match?.[1] === key) {
            return match[2].trim().replace(/^["']|["']$/g, '');
        }
    }
    return undefined;
}

/**
 * Ref du projet Supabase de développement (le sous-domaine de l'URL).
 * Lève si le `.env` est absent ou si l'URL n'a pas la forme attendue, plutôt
 * que de laisser un script taper une URL fantaisiste.
 */
export function devProjectRef() {
    const url = readEnv('EXPO_PUBLIC_SUPABASE_URL');
    if (!url) {
        throw new Error('EXPO_PUBLIC_SUPABASE_URL absent du .env (voir .env.example).');
    }
    const ref = url.match(/^https:\/\/([a-z0-9]+)\.supabase\.co\/?$/)?.[1];
    if (!ref) {
        throw new Error(
            `EXPO_PUBLIC_SUPABASE_URL inattendu : « ${url} » (forme attendue : https://<ref>.supabase.co).`,
        );
    }
    return ref;
}
