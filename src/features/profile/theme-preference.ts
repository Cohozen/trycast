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
        // react-native-web n'implémente pas Appearance.setColorScheme, et
        // lightningcss compile light-dark() en « space toggle » piloté par
        // prefers-color-scheme : --lightningcss-light/dark ('initial' =
        // inactif, ' ' = actif). Forcer un thème = poser ces deux variables
        // en inline sur :root ; system = les retirer (la media query reprend).
        const root = document.documentElement.style;
        if (preference === 'system') {
            root.removeProperty('--lightningcss-light');
            root.removeProperty('--lightningcss-dark');
            root.removeProperty('color-scheme');
        } else {
            root.setProperty('--lightningcss-light', preference === 'light' ? 'initial' : ' ');
            root.setProperty('--lightningcss-dark', preference === 'dark' ? 'initial' : ' ');
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
