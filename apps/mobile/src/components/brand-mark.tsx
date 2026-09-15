import Svg, { Ellipse, G, Line } from 'react-native-svg';

/**
 * Le symbole TryCast « passe vissée » : ballon grenat en rotation avec sa
 * traînée. Géométrie reprise du livrable design (docs/design), couleurs de
 * marque fixes (grenat/crème) identiques dans les deux thèmes.
 */
export function BrandMark({ size = 66 }: { size?: number }) {
    return (
        <Svg height={size} viewBox="0 0 120 120" width={size}>
            <G transform="rotate(-25 72 54)">
                <Line
                    stroke="#F06485"
                    strokeLinecap="round"
                    strokeWidth={6}
                    x1={38}
                    x2={10}
                    y1={54}
                    y2={54}
                />
                <Line
                    opacity={0.7}
                    stroke="#F06485"
                    strokeLinecap="round"
                    strokeWidth={4}
                    x1={40}
                    x2={17}
                    y1={43}
                    y2={43}
                />
                <Line
                    opacity={0.7}
                    stroke="#F06485"
                    strokeLinecap="round"
                    strokeWidth={4}
                    x1={40}
                    x2={17}
                    y1={65}
                    y2={65}
                />
                <Ellipse cx={72} cy={54} fill="#E63E63" rx={30} ry={17} />
                <Line
                    stroke="#F1EBDD"
                    strokeLinecap="round"
                    strokeWidth={2.4}
                    x1={46}
                    x2={98}
                    y1={54}
                    y2={54}
                />
                <Line
                    stroke="#F1EBDD"
                    strokeLinecap="round"
                    strokeWidth={2}
                    x1={56}
                    x2={56}
                    y1={49.5}
                    y2={58.5}
                />
                <Line
                    stroke="#F1EBDD"
                    strokeLinecap="round"
                    strokeWidth={2}
                    x1={64}
                    x2={64}
                    y1={48.5}
                    y2={59.5}
                />
                <Line
                    stroke="#F1EBDD"
                    strokeLinecap="round"
                    strokeWidth={2}
                    x1={72}
                    x2={72}
                    y1={48}
                    y2={60}
                />
                <Line
                    stroke="#F1EBDD"
                    strokeLinecap="round"
                    strokeWidth={2}
                    x1={80}
                    x2={80}
                    y1={48.5}
                    y2={59.5}
                />
                <Line
                    stroke="#F1EBDD"
                    strokeLinecap="round"
                    strokeWidth={2}
                    x1={88}
                    x2={88}
                    y1={49.5}
                    y2={58.5}
                />
            </G>
        </Svg>
    );
}
