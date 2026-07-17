import { useId } from 'react';
import Svg, {
    Circle,
    ClipPath,
    Defs,
    Ellipse,
    G,
    Line,
    Path,
    Polygon,
    Rect,
    Text as SvgText,
} from 'react-native-svg';

import { FLAG_DEFS, type FlagShape } from '@/features/matches/team-flags';
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
const SEAM_TICKS = [-14, -7, 0, 7, 14];

function shapeElement(shape: FlagShape, index: number) {
    switch (shape.kind) {
        case 'rect':
            return (
                <Rect
                    fill={shape.fill}
                    height={shape.height}
                    key={index}
                    width={shape.width}
                    x={shape.x}
                    y={shape.y}
                />
            );
        case 'circle':
            return <Circle cx={shape.cx} cy={shape.cy} fill={shape.fill} key={index} r={shape.r} />;
        case 'polygon':
            return <Polygon fill={shape.fill} key={index} points={shape.points} />;
        case 'path':
            return <Path d={shape.d} fill={shape.fill} key={index} />;
    }
}

/**
 * Identité d'équipe du design system : le drapeau national vit À L'INTÉRIEUR du
 * ballon-comète (clippé par l'ellipse), coutures crème par-dessus — jamais de
 * logo officiel, IP-neutre. Sans drapeau défini, repli ballon aux couleurs de
 * l'équipe + tricode ; sans équipe (à déterminer avant tirage), ballon neutre.
 */
export function TeamFlag({ team, size = 'md' }: TeamFlagProps) {
    const clipId = `team-flag-${useId().replace(/:/g, '')}`;
    const dim = DIMS[size];
    const flag = team?.code ? FLAG_DEFS[team.code] : undefined;
    const color = team?.color ?? '#8A8071';
    const trail = flag?.primary ?? color;
    const code = team?.code ?? '';

    return (
        <Svg height={dim * (96 / 108)} viewBox="0 0 108 96" width={dim}>
            {flag ? (
                <Defs>
                    <ClipPath id={clipId}>
                        <Ellipse cx={CX} cy={CY} rx={RX} ry={RY} transform={ROTATE} />
                    </ClipPath>
                </Defs>
            ) : null}
            <G transform={ROTATE}>
                <Line
                    stroke={trail}
                    strokeLinecap="round"
                    strokeWidth={6}
                    x1={CX - RX - 2}
                    x2={CX - RX - 26}
                    y1={CY}
                    y2={CY}
                />
                <Line
                    opacity={0.55}
                    stroke={trail}
                    strokeLinecap="round"
                    strokeWidth={4}
                    x1={CX - RX}
                    x2={CX - RX - 20}
                    y1={CY - 11}
                    y2={CY - 11}
                />
                <Line
                    opacity={0.55}
                    stroke={trail}
                    strokeLinecap="round"
                    strokeWidth={4}
                    x1={CX - RX}
                    x2={CX - RX - 20}
                    y1={CY + 11}
                    y2={CY + 11}
                />
            </G>
            {flag ? (
                <G clipPath={`url(#${clipId})`}>{flag.shapes.map(shapeElement)}</G>
            ) : (
                <Ellipse cx={CX} cy={CY} fill={color} rx={RX} ry={RY} transform={ROTATE} />
            )}
            <G transform={ROTATE}>
                <Ellipse
                    cx={CX}
                    cy={CY}
                    fill="none"
                    rx={RX}
                    ry={RY}
                    stroke="rgba(0,0,0,0.18)"
                    strokeWidth={1.5}
                />
                {flag ? (
                    <>
                        <Line
                            stroke={CREAM}
                            strokeLinecap="round"
                            strokeWidth={2.4}
                            x1={CX - RX + 4}
                            x2={CX + RX - 4}
                            y1={CY}
                            y2={CY}
                        />
                        {SEAM_TICKS.map((dx) => (
                            <Line
                                key={dx}
                                stroke={CREAM}
                                strokeLinecap="round"
                                strokeWidth={2}
                                x1={CX + dx}
                                x2={CX + dx}
                                y1={CY - 5}
                                y2={CY + 5}
                            />
                        ))}
                    </>
                ) : null}
            </G>
            {!flag && code ? (
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
