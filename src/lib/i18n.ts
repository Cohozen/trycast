import { getLocales } from 'expo-localization';

import { createI18n } from '@/lib/create-i18n';

/**
 * Instance i18n de l'app, initialisée sur la langue du device (repli fr).
 * Le layout racine ré-applique ensuite la préférence explicite éventuelle
 * (Réglages → langue). `i18n.language` est la langue résolue, synchronisée
 * vers profiles.locale pour les notifications localisées.
 */
export const i18n = createI18n(getLocales()[0]?.languageCode ?? 'fr');
