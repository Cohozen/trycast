import { AuthError } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';

import { toFrenchAuthMessage } from './errors';

describe('toFrenchAuthMessage', () => {
  it('traduit les codes d’erreur auth connus', () => {
    expect(toFrenchAuthMessage(new AuthError('Invalid login', 400, 'invalid_credentials'))).toBe(
      'Email ou mot de passe incorrect.',
    );
    expect(toFrenchAuthMessage(new AuthError('Exists', 422, 'user_already_exists'))).toBe(
      'Un compte existe déjà avec cet email.',
    );
  });

  it('retombe sur le message rate-limit pour un statut 429 sans code connu', () => {
    expect(toFrenchAuthMessage(new AuthError('Slow down', 429, 'unknown_code'))).toBe(
      'Trop de tentatives. Réessaie dans quelques minutes.',
    );
  });

  it('détecte les erreurs réseau de fetch', () => {
    expect(toFrenchAuthMessage(new TypeError('Network request failed'))).toBe(
      'Connexion impossible. Vérifie ta connexion internet.',
    );
  });

  it('a un message générique pour tout le reste', () => {
    expect(toFrenchAuthMessage(new Error('boom'))).toBe('Une erreur est survenue. Réessaie.');
    expect(toFrenchAuthMessage(undefined)).toBe('Une erreur est survenue. Réessaie.');
    expect(toFrenchAuthMessage(new AuthError('Unknown', 400, 'not_a_known_code'))).toBe(
      'Une erreur est survenue. Réessaie.',
    );
  });
});
