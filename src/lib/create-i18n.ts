import { createInstance, type i18n as I18nInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';

import auth from '@/locales/fr/auth.json';
import common from '@/locales/fr/common.json';
import leagues from '@/locales/fr/leagues.json';
import matches from '@/locales/fr/matches.json';
import predictions from '@/locales/fr/predictions.json';
import profile from '@/locales/fr/profile.json';

/**
 * Ressources i18n : FR = langue source, un namespace par domaine métier
 * (calqué sur src/features/) + `common` pour le partagé (onglets, actions,
 * erreurs génériques). L'EN rejoindra `resources` avant la RWC 2027 —
 * l'ajout d'une langue ne demande que ses JSON, rien d'autre ne change.
 */
export const resources = {
    fr: { common, auth, matches, predictions, leagues, profile },
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
