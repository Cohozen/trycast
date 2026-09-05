import { useAnimatedProps } from 'react-native-reanimated';
import Svg, { G } from 'react-native-svg';

import { AnimatedLine } from './animated-svg';
import { LIST_ROWS, LIST_SHIFT, pulse } from './motion';
import type { TabIconProps } from './types';

/**
 * Onglet « Mes matchs ». Géométrie verbatim de l'icône « list » de
 * lucide-react-native v1.23.0 — 3 puces « M3 <y>h.01 » et 3 traits
 * « M8 <y>h13 » — redessinée en Line pour rendre chaque rangée animable
 * (un segment à cap rond de longueur 0,01 rend exactement le point de Lucide).
 *
 * À l'activation, les 3 rangées glissent vers la droite puis reviennent, en
 * cascade de haut en bas.
 */
export function MatchesTabIcon({ color, size = 24, strokeWidth = 2, timeline }: TabIconProps) {
    return (
        <Svg fill="none" height={size} viewBox="0 0 24 24" width={size}>
            {LIST_ROWS.map((row) => (
                <ListRow
                    color={color}
                    key={row.y}
                    row={row}
                    strokeWidth={strokeWidth}
                    timeline={timeline}
                />
            ))}
        </Svg>
    );
}

type ListRowProps = Required<Pick<TabIconProps, 'color' | 'strokeWidth' | 'timeline'>> & {
    row: (typeof LIST_ROWS)[number];
};

/** Une rangée puce + trait, décalée par sa propre fenêtre de la frise. */
function ListRow({ color, row, strokeWidth, timeline }: ListRowProps) {
    const dotProps = useAnimatedProps(() => {
        const dx = LIST_SHIFT * pulse(timeline.value, row.start, row.end);
        return { x1: 3 + dx, x2: 3.01 + dx };
    });
    const lineProps = useAnimatedProps(() => {
        const dx = LIST_SHIFT * pulse(timeline.value, row.start, row.end);
        return { x1: 8 + dx, x2: 21 + dx };
    });

    return (
        <G>
            <AnimatedLine
                animatedProps={dotProps}
                stroke={color}
                strokeLinecap="round"
                strokeWidth={strokeWidth}
                x1={3}
                x2={3.01}
                y1={row.y}
                y2={row.y}
            />
            <AnimatedLine
                animatedProps={lineProps}
                stroke={color}
                strokeLinecap="round"
                strokeWidth={strokeWidth}
                x1={8}
                x2={21}
                y1={row.y}
                y2={row.y}
            />
        </G>
    );
}
