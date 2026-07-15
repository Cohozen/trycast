// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
    vite: {
        resolve: {
            // Pas d'alias TS dans ce projet. Sans ça, la découverte tsconfig du resolver
            // rolldown escalade au-dessus de web/ (les modules .astro ne matchent l'include
            // d'aucun tsconfig) et parse le tsconfig racine du repo (app Expo, extends
            // expo/tsconfig.base) — build cassé dès que les deps racine manquent.
            // Le transform natif de rolldown fait la même escalade sans réglage possible :
            // en CI web et sur Vercel, un stub rend le tsconfig racine parseable
            // (.github/workflows/web.yml, web/vercel.json — détails : skill trycast-site-web).
            tsconfigPaths: false,
        },
    },
});
