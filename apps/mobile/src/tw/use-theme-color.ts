import { useColorScheme } from 'react-native';

import { palette, type ThemeColorToken } from './palette';

/**
 * Couleur du DS pour les props JS (icônes lucide, placeholderTextColor,
 * spinners…) — className reste la voie normale pour tout le reste.
 *
 * Web : on renvoie la variable CSS, seule à suivre la bascule manuelle
 * de thème (color-scheme sur :root → light-dark()) que useColorScheme
 * ne voit pas. Natif : littéral depuis la palette, piloté par Appearance.
 */
export function useThemeColor(token: ThemeColorToken): string {
    const scheme = useColorScheme();
    if (process.env.EXPO_OS === 'web') return `var(--color-${token})`;
    return palette[token][scheme === 'dark' ? 'dark' : 'light'];
}
