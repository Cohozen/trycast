import { useAnimatedProps } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { AnimatedLine } from './animated-svg';
import { barShrink, CHART_BARS, CHART_BASELINE, pulse } from './motion';
import type { TabIconProps } from './types';

/**
 * Onglet « Classement ». Géométrie verbatim de l'icône « chart-column » de
 * lucide-react-native v1.23.0 (l'alias BarChart3) : l'axe « M3 3v16a2 2 0 0 0
 * 2 2h16 » reste un Path fixe, les 3 barres verticales deviennent des Line
 * dont seul le sommet (y2) bouge — le pied reste vissé à la ligne de base.
 *
 * À l'activation, les barres se tassent vers la base puis repoussent, en
 * cascade de gauche à droite. On ne les fait pas partir de zéro : mettre trois
 * barres à plat en une frame se lirait comme un raté d'affichage.
 */
export function LeaderboardTabIcon({ color, size = 24, strokeWidth = 2, timeline }: TabIconProps) {
    return (
        <Svg fill="none" height={size} viewBox="0 0 24 24" width={size}>
            <Path
                d="M3 3v16a2 2 0 0 0 2 2h16"
                fill="none"
                stroke={color}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={strokeWidth}
            />
            {CHART_BARS.map((bar) => (
                <ChartBar
                    bar={bar}
                    color={color}
                    key={bar.x}
                    strokeWidth={strokeWidth}
                    timeline={timeline}
                />
            ))}
        </Svg>
    );
}

type ChartBarProps = Required<Pick<TabIconProps, 'color' | 'strokeWidth' | 'timeline'>> & {
    bar: (typeof CHART_BARS)[number];
};

/** Une barre, tassée vers la ligne de base par sa propre fenêtre de la frise. */
function ChartBar({ bar, color, strokeWidth, timeline }: ChartBarProps) {
    const barProps = useAnimatedProps(() => ({
        y2: bar.top + barShrink(bar.top) * pulse(timeline.value, bar.start, bar.end),
    }));

    return (
        <AnimatedLine
            animatedProps={barProps}
            stroke={color}
            strokeLinecap="round"
            strokeWidth={strokeWidth}
            x1={bar.x}
            x2={bar.x}
            y1={CHART_BASELINE}
            y2={bar.top}
        />
    );
}
