// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
    // Domaine primaire (l'apex y redirige). Sert à Astro.site, donc aux URLs
    // absolues d'og:image et og:url : les robots d'aperçu refusent une image
    // relative. C'est aussi l'hôte que déclarent les liens d'application, et
    // le seul sur lequel .well-known/ est vérifié — ni Apple ni Google ne
    // suivent une redirection pour aller le lire.
    site: 'https://www.trycast.fr',
    // Français à la racine, anglais sous /en/ : les URL françaises ne bougent pas, et ce
    // sont elles que connaissent l'app, les e-mails et les liens d'invitation. Chemins
    // et dictionnaires : src/i18n/.
    i18n: {
        locales: ['fr', 'en'],
        defaultLocale: 'fr',
        routing: { prefixDefaultLocale: false },
    },
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
