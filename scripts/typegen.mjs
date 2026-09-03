#!/usr/bin/env node
/**
 * Régénère `src/lib/database.types.ts` depuis le schéma du projet **de dev**
 * (celui du `.env`), puis le reformate.
 *
 *   npm run typegen
 *
 * Le ref n'est plus écrit en dur depuis la scission dev/prod (Lot 9) : le
 * dériver du `.env` garantit que les types reflètent la base sur laquelle on
 * développe, jamais la production.
 */

import { spawnSync } from 'node:child_process';

import { devProjectRef } from './project-ref.mjs';

const ref = devProjectRef();
console.log(`Génération des types depuis le projet ${ref}…`);

const gen = spawnSync(
    'supabase',
    ['gen', 'types', 'typescript', '--project-id', ref, '--schema', 'public'],
    { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 },
);

if (gen.error) {
    console.error(`✗ supabase CLI introuvable ou illisible : ${gen.error.message}`);
    process.exit(1);
}
if (gen.status !== 0) {
    console.error(`✗ supabase gen types a échoué (code ${gen.status}) :\n${gen.stderr}`);
    process.exit(1);
}

// L'écriture ne se fait qu'après un run réussi : une redirection shell aurait
// vidé le fichier avant même de savoir si la commande aboutit.
const OUT = 'src/lib/database.types.ts';
const { writeFileSync } = await import('node:fs');
writeFileSync(OUT, gen.stdout);

const format = spawnSync('npx', ['biome', 'format', '--write', OUT], { stdio: 'inherit' });
process.exit(format.status ?? 0);
