import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';

import { i18n } from '@/lib/i18n';

/**
 * Préférence de langue (écran Réglages). 'system' suit la langue du device ;
 * 'fr'/'en' forcent la langue de l'app. Persistée localement (AsyncStorage),
 * appliquée via i18n.changeLanguage. La langue résolue est aussi poussée dans
 * profiles.locale (par l'écran) pour localiser les notifications.
 */
export type LanguagePreference = 'system' | 'fr' | 'en';

const STORAGE_KEY = 'trycast.language-preference';
const SUPPORTED = ['fr', 'en'] as const;

export async function loadLanguagePreference(): Promise<LanguagePreference> {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    return stored === 'fr' || stored === 'en' ? stored : 'system';
}

function deviceLanguage(): string {
    const code = getLocales()[0]?.languageCode ?? 'fr';
    return (SUPPORTED as readonly string[]).includes(code) ? code : 'fr';
}

/** Langue effective (code i18n) pour une préférence donnée. */
export function resolveLanguage(preference: LanguagePreference): string {
    return preference === 'system' ? deviceLanguage() : preference;
}

export async function setLanguagePreference(preference: LanguagePreference): Promise<void> {
    await i18n.changeLanguage(resolveLanguage(preference));
    await AsyncStorage.setItem(STORAGE_KEY, preference);
}

/** À appeler au démarrage : ré-applique la préférence persistée. */
export async function applyStoredLanguagePreference(): Promise<void> {
    const preference = await loadLanguagePreference();
    if (preference !== 'system') {
        await i18n.changeLanguage(resolveLanguage(preference));
    }
}
