// URLs du site vitrine `web/` utilisées depuis l'app : pages d'atterrissage des
// liens d'e-mail Supabase, pages légales, et liens d'invitation de ligue.
//
// L'hôte est `www.trycast.fr`, domaine **primaire** côté Vercel — l'apex y
// redirige. Cette distinction n'est pas cosmétique : les liens d'e-mail doivent
// correspondre exactement à l'allow-list « Redirect URLs » du projet Supabase
// (cf. `additional_redirect_urls` dans supabase/config.toml, en www), et ni
// Apple ni Google ne suivent les redirections pour vérifier un lien
// d'application (cf. .well-known/ servis par ce même hôte).
//
// Configurable via EXPO_PUBLIC_WEB_URL pour viser un déploiement de préversion.

const WEB_BASE_URL = (process.env.EXPO_PUBLIC_WEB_URL ?? 'https://www.trycast.fr').replace(
    /\/+$/,
    '',
);

/** Après confirmation d'un nouveau compte (signup). */
export const EMAIL_CONFIRM_URL = `${WEB_BASE_URL}/app/confirme`;

/** Après confirmation d'un changement d'adresse e-mail. */
export const EMAIL_CHANGE_URL = `${WEB_BASE_URL}/app/email-modifie`;

// Pages légales du site vitrine. Apple et Google exigent que la politique de
// confidentialité soit atteignable depuis l'app elle-même, pas seulement depuis
// la fiche du store : elles sont ouvertes dans le navigateur intégré
// (`legal-links.tsx` pour les Réglages, `legal-notice.tsx` à l'inscription).
//
// Le site les sert en français à la racine et en anglais sous /en/, avec des
// slugs traduits. Ces chemins répliquent la table `routes` de
// web/src/i18n/index.ts, que l'app ne peut pas importer (web/ est un paquet à
// part) : urls.test.ts casse si les deux divergent.
const LEGAL_PATHS = {
    /** Conditions générales d'utilisation. */
    terms: { fr: '/cgu', en: '/en/terms' },
    /** Politique de confidentialité (RGPD). */
    privacy: { fr: '/confidentialite', en: '/en/privacy' },
    /** Mentions légales (éditeur, hébergeur). */
    legalNotice: { fr: '/mentions-legales', en: '/en/legal-notice' },
} as const;

export type LegalPage = keyof typeof LEGAL_PATHS;

/**
 * Page légale dans la langue de l'app : l'anglais si l'app est en anglais, le
 * français sinon — celui-ci fait foi, et c'est aussi la langue de repli de
 * l'app. Passer `i18n.resolvedLanguage`, la langue réellement affichée.
 */
export function legalUrl(page: LegalPage, language: string | undefined): string {
    const locale = language?.split('-')[0] === 'en' ? 'en' : 'fr';
    return `${WEB_BASE_URL}${LEGAL_PATHS[page][locale]}`;
}

/**
 * Lien d'invitation à une ligue, partagé depuis l'app (`InviteShareActions`).
 *
 * Unique endroit qui connaît la forme de cette URL : elle est aussi celle que
 * le site sert (`web/src/pages/rejoindre.astro`, via un rewrite Vercel) et
 * celle que les liens d'application déclarent côté natif (`pathPrefix`
 * `/rejoindre`). La changer ici impose de la changer aux deux autres endroits.
 */
export function buildInviteUrl(code: string): string {
    return `${WEB_BASE_URL}/rejoindre/${code}`;
}
