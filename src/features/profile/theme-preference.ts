import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance, Platform } from 'react-native';

/**
 * Préférence de thème (écran Réglages). 'system' laisse l'OS décider ;
 * 'light'/'dark' forcent le scheme via Appearance.setColorScheme, que
 * react-native-css et la navigation suivent (light-dark(), useColorScheme).
 */
export type ThemePreference = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'trycast.theme-preference';

export async function loadThemePreference(): Promise<ThemePreference> {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    return stored === 'light' || stored === 'dark' ? stored : 'system';
}

function applyScheme(preference: ThemePreference): void {
    if (Platform.OS === 'web') {
        if (typeof document === 'undefined') return;
        // react-native-web n'implémente pas Appearance.setColorScheme. Le
        // plancher browserslist (package.json) préserve light-dark() tel quel,
        // et light-dark() se pilote par la propriété standard color-scheme :
        // la poser en inline sur :root force le thème, la retirer rend la
        // main au `color-scheme: light dark` de global.css (scheme système).
        const root = document.documentElement.style;
        if (preference === 'system') {
            root.removeProperty('color-scheme');
        } else {
            root.setProperty('color-scheme', preference);
        }
        return;
    }
    // 'unspecified' rend la main au scheme de l'OS (RN 0.86)
    Appearance.setColorScheme(preference === 'system' ? 'unspecified' : preference);
}

export async function setThemePreference(preference: ThemePreference): Promise<void> {
    applyScheme(preference);
    await AsyncStorage.setItem(STORAGE_KEY, preference);
}

/** À appeler au démarrage : ré-applique la préférence persistée. */
export async function applyStoredThemePreference(): Promise<void> {
    const preference = await loadThemePreference();
    if (preference !== 'system') {
        applyScheme(preference);
    }
}
