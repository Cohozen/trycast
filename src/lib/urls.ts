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

/** Conditions générales d'utilisation. */
export const TERMS_URL = `${WEB_BASE_URL}/cgu`;

/** Politique de confidentialité (RGPD). */
export const PRIVACY_URL = `${WEB_BASE_URL}/confidentialite`;

/** Mentions légales (éditeur, hébergeur). */
export const LEGAL_NOTICE_URL = `${WEB_BASE_URL}/mentions-legales`;

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
