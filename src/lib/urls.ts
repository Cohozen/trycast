// URLs d'atterrissage vers lesquelles Supabase redirige les liens d'e-mail
// (confirmation de compte, changement d'adresse). Ce sont des pages statiques
// du site vitrine `web/` — voir web/src/pages/app/. Le domaine peut changer
// (Vercel puis trycast.fr) : configurable via EXPO_PUBLIC_WEB_URL, avec repli
// sur le domaine cible. Chaque URL utilisée ici doit figurer dans l'allow-list
// « Redirect URLs » du projet Supabase, sinon la redirection est refusée.

const WEB_BASE_URL = (process.env.EXPO_PUBLIC_WEB_URL ?? 'https://trycast.fr').replace(/\/+$/, '');

/** Après confirmation d'un nouveau compte (signup). */
export const EMAIL_CONFIRM_URL = `${WEB_BASE_URL}/app/confirme`;

/** Après confirmation d'un changement d'adresse e-mail. */
export const EMAIL_CHANGE_URL = `${WEB_BASE_URL}/app/email-modifie`;
