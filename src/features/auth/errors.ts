import { AuthError, isAuthError } from '@supabase/supabase-js';

const AUTH_MESSAGES: Record<string, string> = {
  invalid_credentials: 'Email ou mot de passe incorrect.',
  user_already_exists: 'Un compte existe déjà avec cet email.',
  email_exists: 'Un compte existe déjà avec cet email.',
  email_not_confirmed: 'Confirme ton email avant de te connecter.',
  weak_password: 'Mot de passe trop faible : 8 caractères minimum.',
  same_password: "Le nouveau mot de passe doit être différent de l'ancien.",
  over_request_rate_limit: 'Trop de tentatives. Réessaie dans quelques minutes.',
  over_email_send_rate_limit: 'Trop d’emails envoyés. Réessaie dans quelques minutes.',
  validation_failed: 'Adresse email invalide.',
  user_not_found: 'Aucun compte associé à cet email.',
  session_expired: 'Ta session a expiré, reconnecte-toi.',
};

/** Traduit une erreur Supabase (ou réseau) en message affichable en français. */
export function toFrenchAuthMessage(error: unknown): string {
  if (isAuthError(error) && error.code && AUTH_MESSAGES[error.code]) {
    return AUTH_MESSAGES[error.code];
  }
  if (error instanceof AuthError && error.status === 429) {
    return 'Trop de tentatives. Réessaie dans quelques minutes.';
  }
  if (error instanceof Error && /network request failed/i.test(error.message)) {
    return 'Connexion impossible. Vérifie ta connexion internet.';
  }
  return 'Une erreur est survenue. Réessaie.';
}
