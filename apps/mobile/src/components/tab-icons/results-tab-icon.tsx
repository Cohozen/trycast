import { useAnimatedProps } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { AnimatedPath } from './animated-svg';
import { CHECK_DASH, CHECK_WINDOW, rise } from './motion';
import type { TabIconProps } from './types';

/**
 * Onglet « Résultats ». Géométrie verbatim de l'icône « circle-check-big » de
 * lucide-react-native v1.23.0 (l'alias CheckCircle) : l'arc reste fixe — c'est
 * le repère stable pendant que la coche se dessine.
 *
 * À l'activation, la coche se retrace de son départ vers sa pointe. C'est la
 * seule des quatre animations qui ne soit pas un aller-retour : elle repart
 * d'un trait effacé, discontinuité d'une frame assumée, à l'instant du tap et
 * sous le doigt.
 *
 * strokeDasharray est déclaré statiquement et n'est JAMAIS animé : sans lui,
 * react-native-svg ne transmet pas strokeDashoffset au natif.
 */
export function ResultsTabIcon({ color, size = 24, strokeWidth = 2, timeline }: TabIconProps) {
    const checkProps = useAnimatedProps(() => ({
        strokeDashoffset:
            CHECK_DASH * (1 - rise(timeline.value, CHECK_WINDOW.start, CHECK_WINDOW.end)),
    }));

    return (
        <Svg fill="none" height={size} viewBox="0 0 24 24" width={size}>
            <Path
                d="M21.801 10A10 10 0 1 1 17 3.335"
                fill="none"
                stroke={color}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={strokeWidth}
            />
            <AnimatedPath
                animatedProps={checkProps}
                d="m9 11 3 3L22 4"
                fill="none"
                stroke={color}
                strokeDasharray={[CHECK_DASH, CHECK_DASH]}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={strokeWidth}
            />
        </Svg>
    );
}
