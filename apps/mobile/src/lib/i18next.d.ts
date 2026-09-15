import type { defaultNS, resources } from '@/lib/create-i18n';

/**
 * Clés de traduction typées : `t('auth:...')` est vérifié par tsc contre les
 * JSON de src/locales/fr/ — une clé manquante casse le typecheck.
 */
declare module 'i18next' {
    interface CustomTypeOptions {
        defaultNS: typeof defaultNS;
        resources: (typeof resources)['fr'];
    }
}
