// Garde-fou des pages légales traduites : chaque page anglaise doit garder la structure
// de sa version française, qui seule fait foi. On compte les sections (<h2>) et les
// éléments de liste (<li>) — une section ou une donnée collectée ajoutée d'un côté
// seulement fait échouer `npm run check`, donc la CI web. Ça n'attrape pas une phrase
// modifiée à l'intérieur d'un paragraphe : la règle reste « une page légale FR modifiée
// = sa jumelle EN dans le même commit ».
//
// Paires alignées sur la table `routes` de src/i18n/index.ts (slugs FR ↔ EN).
import { readFileSync } from 'node:fs';

const pairs = [
    ['src/pages/cgu.astro', 'src/pages/en/terms.astro'],
    ['src/pages/confidentialite.astro', 'src/pages/en/privacy.astro'],
    ['src/pages/mentions-legales.astro', 'src/pages/en/legal-notice.astro'],
    ['src/pages/suppression-compte.astro', 'src/pages/en/delete-account.astro'],
];

const count = (source, tag) => (source.match(new RegExp(`<${tag}[\\s>]`, 'g')) ?? []).length;

let failures = 0;
for (const [fr, en] of pairs) {
    const frSource = readFileSync(fr, 'utf8');
    const enSource = readFileSync(en, 'utf8');
    for (const tag of ['h2', 'li']) {
        const [frCount, enCount] = [count(frSource, tag), count(enSource, tag)];
        if (frCount !== enCount) {
            console.error(`✗ ${en} : ${enCount} <${tag}> contre ${frCount} dans ${fr}`);
            failures += 1;
        }
    }
}

if (failures > 0) {
    console.error('Pages légales désalignées : reporter la modification sur la version anglaise.');
    process.exit(1);
}
console.log(`✓ Pages légales FR/EN alignées (${pairs.length} paires).`);
