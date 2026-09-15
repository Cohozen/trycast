import type { ReactElement } from 'react';
import type { SharedValue } from 'react-native-reanimated';

/**
 * Contrat des 4 icônes de la barre d'onglets. Elles remplacent les composants
 * lucide-react-native de la barre (et d'elles seules : le reste de l'app
 * continue d'utiliser Lucide normalement), parce qu'un composant Lucide ne
 * laisse pas adresser ses traits un par un.
 */
export type TabIconProps = {
    /** Couleur du trait, issue de useThemeColor (hex en natif, var() CSS sur web). */
    color: string;
    /** Côté du carré de dessin, en px. viewBox Lucide : 0 0 24 24. */
    size?: number;
    strokeWidth?: number;
    /**
     * Frise 0 → 1 de l'animation d'activation, PARTAGÉE par les deux couches
     * empilées de l'onglet (grise inactive et grenat active) : c'est ce qui
     * les garde en phase et empêche les traits gris de dépasser. Repos = 1.
     */
    timeline: SharedValue<number>;
};

/** Remplace `LucideIcon` dans les props de TabButton. */
export type TabIconComponent = (props: TabIconProps) => ReactElement;
