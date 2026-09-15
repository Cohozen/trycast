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
            // rolldown escalade au-dessus de apps/web/ (les modules .astro ne matchent
            // l'include d'aucun tsconfig) et parserait le premier tsconfig parent venu.
            // Le transform natif de rolldown fait la même escalade sans réglage possible :
            // aucun tsconfig.json ne doit donc exister à la racine du dépôt ni dans apps/.
            // Quand l'app Expo occupait la racine, il fallait un stub d'expo/tsconfig.base
            // en CI et sur Vercel (détails : skill trycast-site-web).
            tsconfigPaths: false,
        },
    },
});
