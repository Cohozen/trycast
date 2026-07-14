import { DarkTheme, DefaultTheme } from 'expo-router';

import { palette } from './palette';

type NavigationTheme = typeof DefaultTheme;

/**
 * Thème React Navigation calé sur les tokens du DS : fonds sable/charbon,
 * surfaces, texte et hairlines de `palette.ts`, Inter pour les libellés.
 * Consommé par le ThemeProvider racine — il pilote les headers natifs des
 * écrans poussés et le fond des transitions entre écrans (plus de flash
 * blanc/noir stock de react-navigation).
 */
function themeFor(scheme: 'light' | 'dark'): NavigationTheme {
    const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
    return {
        ...base,
        colors: {
            ...base.colors,
            primary: palette.accent[scheme],
            background: palette.bg[scheme],
            card: palette.surface[scheme],
            text: palette.text[scheme],
            border: palette.border[scheme],
            notification: palette.accent[scheme],
        },
        fonts: {
            // Polices custom : la graisse vient de la famille, pas de fontWeight
            // (en natif, un fontWeight CSS ne change pas la graisse d'Inter).
            regular: { fontFamily: 'Inter_400Regular', fontWeight: 'normal' },
            medium: { fontFamily: 'Inter_500Medium', fontWeight: 'normal' },
            bold: { fontFamily: 'Inter_600SemiBold', fontWeight: 'normal' },
            heavy: { fontFamily: 'Inter_700Bold', fontWeight: 'normal' },
        },
    };
}

export const navigationThemes = {
    light: themeFor('light'),
    dark: themeFor('dark'),
} as const;
