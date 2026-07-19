import { createInstance, type i18n as I18nInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';

import authEn from '@/locales/en/auth.json';
import celebrationEn from '@/locales/en/celebration.json';
import commonEn from '@/locales/en/common.json';
import leaguesEn from '@/locales/en/leagues.json';
import matchesEn from '@/locales/en/matches.json';
import predictionsEn from '@/locales/en/predictions.json';
import profileEn from '@/locales/en/profile.json';
import auth from '@/locales/fr/auth.json';
import celebration from '@/locales/fr/celebration.json';
import common from '@/locales/fr/common.json';
import leagues from '@/locales/fr/leagues.json';
import matches from '@/locales/fr/matches.json';
import predictions from '@/locales/fr/predictions.json';
import profile from '@/locales/fr/profile.json';

/**
 * Ressources i18n : FR = langue source, un namespace par domaine métier
 * (calqué sur src/features/) + `common` pour le partagé (onglets, actions,
 * erreurs génériques). EN est calqué sur FR à l'identique (parité des clés
 * verrouillée par create-i18n.test.ts) ; ajouter une langue = ses JSON + une
 * entrée ici, rien d'autre ne change.
 */
export const resources = {
    fr: { common, auth, matches, predictions, leagues, profile, celebration },
    en: {
        common: commonEn,
        auth: authEn,
        matches: matchesEn,
        predictions: predictionsEn,
        leagues: leaguesEn,
        profile: profileEn,
        celebration: celebrationEn,
    },
} as const;

export const defaultNS = 'common';

/**
 * Fabrique une instance i18next configurée. Séparée de `@/lib/i18n` (qui lit
 * la langue du device via expo-localization, module natif) pour rester
 * testable unitairement sous Vitest.
 */
export function createI18n(language: string): I18nInstance {
    const instance = createInstance();
    instance.use(initReactI18next).init({
        resources,
        lng: language,
        fallbackLng: 'fr',
        defaultNS,
        interpolation: { escapeValue: false }, // React échappe déjà
    });
    return instance;
}
