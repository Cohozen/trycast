import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Hauteur réservée à la pilule de la tab bar flottante (~82px) + un peu d'air. */
const TAB_BAR_CLEARANCE = 94;

/**
 * Marges d'écran calées sur les zones système : barre d'état/encoche en haut,
 * barre gestuelle en bas. Les planchers reprennent les anciennes valeurs fixes
 * du DS (pt-14 = 56px en haut, pb-32 = 128px sous la tab bar sur iPhone à
 * encoche) — rien ne bouge sur les appareils déjà calibrés, seuls les insets
 * plus grands (barre d'état Android haute…) gagnent de la place. Valeurs
 * runtime : à passer via la prop `style`/`contentContainerStyle`, jamais en
 * className.
 */
export function useScreenInsets() {
    const insets = useSafeAreaInsets();
    return {
        /** Padding haut d'un écran sans header natif (remplace `pt-14`). */
        top: Math.max(insets.top, 56),
        /** Padding bas d'un contenu qui défile sous la tab bar flottante (remplace `pb-32`). */
        bottomTabBar: TAB_BAR_CLEARANCE + Math.max(insets.bottom, 16),
    };
}
