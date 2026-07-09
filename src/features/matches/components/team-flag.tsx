import Svg, { Ellipse, G, Line, Text as SvgText } from 'react-native-svg';

import type { TeamRow } from '@/features/matches/types';

type TeamFlagSize = 'sm' | 'md' | 'lg';

type TeamFlagProps = {
    team: TeamRow | null;
    size?: TeamFlagSize;
};

const DIMS: Record<TeamFlagSize, number> = { sm: 30, md: 46, lg: 62 };

// Géométrie du ballon-comète du DS (viewBox 108×96, traînée vers la gauche)
const CX = 58;
const CY = 50;
const RX = 33;
const RY = 19;
const ROTATE = 'rotate(-22 58 50)';
const CREAM = '#F1EBDD';

/**
 * Identité d'équipe du design system : ballon aux couleurs de l'équipe avec
 * traînée + tricode (jamais de logo officiel, IP-neutre). Sans équipe
 * (à déterminer avant tirage), ballon neutre sans code.
 */
export function TeamFlag({ team, size = 'md' }: TeamFlagProps) {
    const dim = DIMS[size];
    const color = team?.color ?? '#8A8071';
    const code = team?.code ?? '';

    return (
        <Svg height={dim * (96 / 108)} viewBox="0 0 108 96" width={dim}>
            <G transform={ROTATE}>
                <Line
                    stroke={color}
                    strokeLinecap="round"
                    strokeWidth={6}
                    x1={CX - RX - 2}
                    x2={CX - RX - 26}
                    y1={CY}
                    y2={CY}
                />
                <Line
                    opacity={0.55}
                    stroke={color}
                    strokeLinecap="round"
                    strokeWidth={4}
                    x1={CX - RX}
                    x2={CX - RX - 20}
                    y1={CY - 11}
                    y2={CY - 11}
                />
                <Line
                    opacity={0.55}
                    stroke={color}
                    strokeLinecap="round"
                    strokeWidth={4}
                    x1={CX - RX}
                    x2={CX - RX - 20}
                    y1={CY + 11}
                    y2={CY + 11}
                />
                <Ellipse cx={CX} cy={CY} fill={color} rx={RX} ry={RY} />
                <Ellipse
                    cx={CX}
                    cy={CY}
                    fill="none"
                    rx={RX}
                    ry={RY}
                    stroke="rgba(0,0,0,0.18)"
                    strokeWidth={1.5}
                />
            </G>
            {code ? (
                <SvgText
                    fill={CREAM}
                    fontFamily="Inter_700Bold"
                    fontSize={15}
                    textAnchor="middle"
                    x={CX}
                    y={CY + 5}>
                    {code}
                </SvgText>
            ) : null}
        </Svg>
    );
}
