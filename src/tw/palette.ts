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
    bg: { light: '#faf8f4', dark: '#100e0b' },
    surface: { light: '#ffffff', dark: '#211d17' },
    'surface-sunken': { light: '#f3f0ea', dark: '#080705' },
    border: { light: '#e8e3d9', dark: '#453d2f' },
    'border-strong': { light: '#d6cfc1', dark: '#6b6252' },
    text: { light: '#16130e', dark: '#f8f5ef' },
    'text-muted': { light: '#5f584b', dark: '#cdc4b3' },
    'text-faint': { light: '#928a7b', dark: '#9c9382' },
    brand: { light: '#14432a', dark: '#5fc48a' },
    'on-brand': { light: '#faf8f4', dark: '#080705' },
    accent: { light: '#e63e63', dark: '#e63e63' },
    'accent-hover': { light: '#f06485', dark: '#f06485' },
    'accent-press': { light: '#c82e52', dark: '#c82e52' },
    'on-accent': { light: '#ffffff', dark: '#ffffff' },
    'focus-ring': { light: '#e63e63', dark: '#f06485' },
    danger: { light: '#c4362b', dark: '#f0685a' },
    'danger-press': { light: '#a82c22', dark: '#d8564a' },
    'on-danger': { light: '#faf8f4', dark: '#2a0f0c' },
    success: { light: '#2e8b57', dark: '#4fbf80' },
    warning: { light: '#d8a23a', dark: '#e9b85a' },
    info: { light: '#3c7da6', dark: '#5aa8d4' },
    live: { light: '#e63e63', dark: '#e63e63' },
    'green-900': { light: '#0e3320', dark: '#0e3320' },
    'green-800': { light: '#14432a', dark: '#14432a' },
    'green-700': { light: '#1c5638', dark: '#1c5638' },
    'green-600': { light: '#26694a', dark: '#26694a' },
    'green-500': { light: '#328b5c', dark: '#328b5c' },
    'green-400': { light: '#43a56e', dark: '#43a56e' },
    'green-300': { light: '#5fc48a', dark: '#5fc48a' },
    'grenat-600': { light: '#c82e52', dark: '#c82e52' },
    'grenat-500': { light: '#e63e63', dark: '#e63e63' },
    'grenat-400': { light: '#f06485', dark: '#f06485' },
    'sand-050': { light: '#faf8f4', dark: '#faf8f4' },
    'sand-100': { light: '#ffffff', dark: '#ffffff' },
    'sand-150': { light: '#f3f0ea', dark: '#f3f0ea' },
    'sand-200': { light: '#e8e3d9', dark: '#e8e3d9' },
    'sand-300': { light: '#d6cfc1', dark: '#d6cfc1' },
    'char-950': { light: '#080705', dark: '#080705' },
    'char-900': { light: '#100e0b', dark: '#100e0b' },
    'char-850': { light: '#211d17', dark: '#211d17' },
    'char-800': { light: '#2e2921', dark: '#2e2921' },
    'char-700': { light: '#6b6252', dark: '#6b6252' },
    'char-600': { light: '#453d2f', dark: '#453d2f' },
    'paper-100': { light: '#f8f5ef', dark: '#f8f5ef' },
    'paper-300': { light: '#cdc4b3', dark: '#cdc4b3' },
    'paper-500': { light: '#9c9382', dark: '#9c9382' },
    'ink-900': { light: '#16130e', dark: '#16130e' },
    'ink-600': { light: '#5f584b', dark: '#5f584b' },
    'ink-400': { light: '#928a7b', dark: '#928a7b' },
    cream: { light: '#f1ebdd', dark: '#f1ebdd' },
    'cream-100': { light: '#fbf7ef', dark: '#fbf7ef' },
    'cream-200': { light: '#e7dfcc', dark: '#e7dfcc' },
    'mist-300': { light: '#a9c0b2', dark: '#a9c0b2' },
} as const satisfies Record<string, { light: string; dark: string }>;

export type ThemeColorToken = keyof typeof palette;
