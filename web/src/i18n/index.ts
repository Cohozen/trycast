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
} as const satisfies Record<string, Record<Locale, string>>;

export type RouteName = keyof typeof routes;

export function localePath(route: RouteName, locale: Locale): string {
    return routes[route][locale];
}
