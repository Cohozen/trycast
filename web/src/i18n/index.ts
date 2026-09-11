// Point d'entrée de l'i18n du site. Le français est servi à la racine, l'anglais sous
// /en/ (i18n d'Astro, `prefixDefaultLocale: false` dans astro.config.mjs) : aucune URL
// française ne bouge, et ce sont elles que l'app, les e-mails Supabase et les liens
// d'invitation connaissent.
import { en } from './en';
import { type Dictionary, fr } from './fr';

export const locales = ['fr', 'en'] as const;
export type Locale = (typeof locales)[number];

const dictionaries: Record<Locale, Dictionary> = { fr, en };

/** `Astro.currentLocale` est typé `string | undefined` : tout ce qui n'est pas l'anglais est du français. */
export function toLocale(value: string | undefined): Locale {
    return value === 'en' ? 'en' : 'fr';
}

export function getDictionary(locale: Locale): Dictionary {
    return dictionaries[locale];
}

export function otherLocale(locale: Locale): Locale {
    return locale === 'fr' ? 'en' : 'fr';
}

/**
 * Table des pages indexables, seule source de leurs chemins dans chaque langue : le
 * sélecteur de langue et les balises hreflang y lisent la page équivalente. Les slugs
 * anglais sont traduits ; les français sont ceux qu'utilisent l'app (src/lib/urls.ts)
 * et les stores — ne pas les renommer.
 */
export const routes = {
    home: { fr: '/', en: '/en/' },
    terms: { fr: '/cgu', en: '/en/terms' },
    privacy: { fr: '/confidentialite', en: '/en/privacy' },
    legalNotice: { fr: '/mentions-legales', en: '/en/legal-notice' },
    deleteAccount: { fr: '/suppression-compte', en: '/en/delete-account' },
} as const satisfies Record<string, Record<Locale, string>>;

export type RouteName = keyof typeof routes;

export function localePath(route: RouteName, locale: Locale): string {
    return routes[route][locale];
}

/**
 * Date de dernière mise à jour des pages légales, commune aux deux langues : la
 * traduction anglaise suit la version française, qui seule fait foi. Modifier une page
 * légale, c'est modifier sa jumelle dans le même commit et avancer cette date
 * (garde-fou structurel : scripts/check-legal-parity.mjs).
 */
export const legalUpdatedAt = {
    terms: '2026-09-03',
    privacy: '2026-09-03',
    legalNotice: '2026-07-15',
    deleteAccount: '2026-07-27',
} as const satisfies Partial<Record<RouteName, string>>;

export type LegalRoute = keyof typeof legalUpdatedAt;

/** Étiquettes BCP 47 pour Intl ; l'anglais est britannique, comme la voix du site. */
export const intlLocales = { fr: 'fr-FR', en: 'en-GB' } as const satisfies Record<Locale, string>;
