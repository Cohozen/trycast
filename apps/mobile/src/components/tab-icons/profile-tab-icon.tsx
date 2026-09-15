import { useAnimatedProps } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { AnimatedCircle } from './animated-svg';
import { HEAD_NOD, HEAD_WINDOW, pulse } from './motion';
import type { TabIconProps } from './types';

/**
 * Onglet « Profil ». Géométrie verbatim de l'icône « user » de
 * lucide-react-native v1.23.0 : épaules « M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0
 * 0-4 4v2 » fixes, tête en Circle dont seul le cy bouge.
 *
 * À l'activation, la tête hoche : elle descend d'une unité puis remonte.
 *
 * fill="none" est posé explicitement sur le cercle : Lucide le passe à chacun
 * de ses enfants, alors que le fill par défaut de react-native-svg est NOIR —
 * sans ça la tête devient une pastille pleine.
 */
export function ProfileTabIcon({ color, size = 24, strokeWidth = 2, timeline }: TabIconProps) {
    const headProps = useAnimatedProps(() => ({
        cy: 7 + HEAD_NOD * pulse(timeline.value, HEAD_WINDOW.start, HEAD_WINDOW.end),
    }));

    return (
        <Svg fill="none" height={size} viewBox="0 0 24 24" width={size}>
            <Path
                d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"
                fill="none"
                stroke={color}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={strokeWidth}
            />
            <AnimatedCircle
                animatedProps={headProps}
                cx={12}
                cy={7}
                fill="none"
                r={4}
                stroke={color}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={strokeWidth}
            />
        </Svg>
    );
}
