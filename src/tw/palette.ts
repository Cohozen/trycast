/**
 * Palette du design system, côté TS — pour les couleurs lues en JS
 * (icônes lucide, placeholderTextColor, spinners…), là où className
 * ne s'applique pas.
 *
 * Les hex sont volontairement dupliqués depuis src/global.css :
 * react-native-css n'expose pas les variables CSS au runtime natif.
 * palette.test.ts vérifie que les deux fichiers restent identiques.
 */
export const palette = {
    bg: { light: '#faf8f4', dark: '#17140f' },
    surface: { light: '#ffffff', dark: '#201c16' },
    'surface-sunken': { light: '#f3f0ea', dark: '#100e0b' },
    border: { light: '#e8e3d9', dark: '#2f2921' },
    'border-strong': { light: '#d6cfc1', dark: '#383127' },
    text: { light: '#16130e', dark: '#f4f0e9' },
    'text-muted': { light: '#5f584b', dark: '#b2a999' },
    'text-faint': { light: '#928a7b', dark: '#7d7666' },
    brand: { light: '#14432a', dark: '#43a56e' },
    'on-brand': { light: '#faf8f4', dark: '#100e0b' },
    accent: { light: '#e63e63', dark: '#e63e63' },
    'accent-hover': { light: '#f06485', dark: '#f06485' },
    'accent-press': { light: '#c82e52', dark: '#c82e52' },
    'on-accent': { light: '#ffffff', dark: '#ffffff' },
    'focus-ring': { light: '#e63e63', dark: '#f06485' },
    danger: { light: '#c4362b', dark: '#f0685a' },
    'danger-press': { light: '#a82c22', dark: '#d8564a' },
    'on-danger': { light: '#fbf7ef', dark: '#2a0f0c' },
    success: { light: '#2e8b57', dark: '#2e8b57' },
    warning: { light: '#d8a23a', dark: '#d8a23a' },
    info: { light: '#3c7da6', dark: '#3c7da6' },
    live: { light: '#e63e63', dark: '#e63e63' },
    'green-900': { light: '#0e3320', dark: '#0e3320' },
    'green-800': { light: '#14432a', dark: '#14432a' },
    'green-700': { light: '#1c5638', dark: '#1c5638' },
    'green-600': { light: '#26694a', dark: '#26694a' },
    'grenat-600': { light: '#c82e52', dark: '#c82e52' },
    'grenat-500': { light: '#e63e63', dark: '#e63e63' },
    'grenat-400': { light: '#f06485', dark: '#f06485' },
    cream: { light: '#f1ebdd', dark: '#f1ebdd' },
    'cream-100': { light: '#fbf7ef', dark: '#fbf7ef' },
    'cream-200': { light: '#e7dfcc', dark: '#e7dfcc' },
    'ink-900': { light: '#16130e', dark: '#16130e' },
    'ink-600': { light: '#5f584b', dark: '#5f584b' },
    'ink-400': { light: '#928a7b', dark: '#928a7b' },
    'mist-300': { light: '#a9c0b2', dark: '#a9c0b2' },
} as const satisfies Record<string, { light: string; dark: string }>;

export type ThemeColorToken = keyof typeof palette;
