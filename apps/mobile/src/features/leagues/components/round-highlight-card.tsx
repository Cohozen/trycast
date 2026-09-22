import { ChevronRight, MessageCirclePlus, Star } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Animated, {
    FadeInDown,
    ReduceMotion,
    useAnimatedStyle,
    useReducedMotion,
    useSharedValue,
    withDelay,
    withTiming,
} from 'react-native-reanimated';

import { Badge } from '@/components/ui/badge';
import { RoundHighlightLaureate } from '@/features/leagues/components/round-highlight-laureate';
import type { HighlightLaureate, RoundHighlight } from '@/features/leagues/round-highlight';
import { TeamFlag } from '@/features/matches/components/team-flag';
import { teamName } from '@/features/matches/format-match';
import type { MatchWithTeams } from '@/features/matches/types';
import { Pressable, Text, useThemeColor, View } from '@/tw';
import { cn } from '@/tw/variants';

type RoundHighlightCardProps = {
    highlight: RoundHighlight;
    /** Libellé de la journée (« Journée 3 », « Finale »). */
    roundLabel: string;
    /** Matchs de la compétition, pour les équipes et le score final. */
    matchesById: ReadonlyMap<string, MatchWithTeams>;
    /** Arrivée depuis la notification : apparition et éclat, une fois. */
    arriving?: boolean;
    onOpen: (laureate: HighlightLaureate) => void;
};

/**
 * Coup de la journée (DS « TryCast Coup du Jour », 2026-09-21), en tête de la
 * journée sélectionnée dans l'onglet Résultats de la ligue. Une étincelle
 * grenat sur surface neutre : bordure, overline et points, jamais de fond.
 * Le tap ouvre le match du lauréat, là où vit la barre de réaction ; en ex æquo
 * sur des matchs différents, chaque ligne ouvre le sien.
 */
export function RoundHighlightCard({
    highlight,
    roundLabel,
    matchesById,
    arriving = false,
    onOpen,
}: RoundHighlightCardProps) {
    const { t } = useTranslation(['leagues', 'matches']);
    const accent = useThemeColor('accent');
    const muted = useThemeColor('text-muted');
    const faint = useThemeColor('text-faint');
    const reduceMotion = useReducedMotion();
    const [pressed, setPressed] = useState(false);

    const { audience, laureates, story } = highlight;
    const single = laureates.length === 1;
    const [first] = laureates;
    const match = matchesById.get(first.matchId);
    const nameOf = (team: MatchWithTeams['home_team']) =>
        team ? teamName(team, t) : t('matches:teamTbd');

    const title =
        audience === 'other' || audience === 'me'
            ? t(`leagues:detail.results.highlight.title.${audience}.${highlight.variant}`)
            : t(`leagues:detail.results.highlight.title.${audience}`);
    const accroche =
        audience === 'other' || audience === 'me'
            ? t(`leagues:detail.results.highlight.accroche.${audience}.${highlight.accroche}`, {
                  name: first.username,
              })
            : t(`leagues:detail.results.highlight.accroche.${audience}`);

    const storyText = (() => {
        if (!highlight.sameMatch) {
            return t('leagues:detail.results.highlight.story.split', { winners: story.winners });
        }
        const base = story.draw
            ? t('leagues:detail.results.highlight.story.draw', {
                  count: story.winners,
                  total: story.total,
              })
            : story.crowdOutcome === 'draw'
              ? t('leagues:detail.results.highlight.story.crowdDraw', {
                    crowd: story.crowdCount,
                    total: story.total,
                })
              : t('leagues:detail.results.highlight.story.win', {
                    crowd: story.crowdCount,
                    total: story.total,
                    team: nameOf(
                        story.crowdOutcome === 'home'
                            ? (match?.home_team ?? null)
                            : (match?.away_team ?? null),
                    ),
                });
        return audience === 'me'
            ? `${base} ${t('leagues:detail.results.highlight.story.notYou')}`
            : base;
    })();

    // Éclat d'arrivée : un anneau grenat qui s'évanouit, une seule fois
    const ring = useSharedValue(0);
    useEffect(() => {
        if (arriving && !reduceMotion) {
            ring.value = withDelay(260, withTiming(1, { duration: 1200 }));
        }
    }, [arriving, reduceMotion, ring]);
    const ringStyle = useAnimatedStyle(() => ({
        opacity: ring.value > 0 && ring.value < 1 ? 0.55 * (1 - ring.value) : 0,
        transform: [{ scale: 1 + 0.03 * ring.value }],
    }));

    return (
        <Animated.View
            entering={
                arriving ? FadeInDown.duration(340).reduceMotion(ReduceMotion.System) : undefined
            }>
            <Animated.View
                pointerEvents="none"
                style={[
                    {
                        position: 'absolute',
                        top: -2,
                        left: -2,
                        right: -2,
                        bottom: -2,
                        borderRadius: 22,
                        borderWidth: 2,
                        borderColor: accent,
                    },
                    ringStyle,
                ]}
            />
            <Pressable
                accessibilityLabel={t('leagues:detail.results.highlight.a11y', { title })}
                accessibilityRole="button"
                className={cn(
                    'will-change-variable gap-[11px] overflow-hidden rounded-lg border-[1.5px] border-accent/40 bg-surface px-3.5 pt-3.5 tc-shadow-md',
                    pressed && 'scale-[0.985]',
                )}
                onPress={() => onOpen(first)}
                onPressIn={() => setPressed(true)}
                onPressOut={() => setPressed(false)}>
                <View className="flex-row items-center justify-between gap-2">
                    <View className="shrink flex-row items-center gap-1.5">
                        <Star color={accent} fill={accent} size={12} />
                        <Text
                            className="shrink font-body-bold text-[10.5px] uppercase tracking-[1.15px] text-accent"
                            numberOfLines={1}>
                            {audience === 'me'
                                ? t('leagues:detail.results.highlight.overlineMe')
                                : t('leagues:detail.results.highlight.overline')}
                        </Text>
                    </View>
                    <Text
                        className="font-body-bold text-[10.5px] uppercase tracking-[0.84px] text-text-faint"
                        numberOfLines={1}>
                        {roundLabel}
                    </Text>
                </View>

                <View className="gap-[5px]">
                    <Text className="font-display text-[25px] leading-[30px] tracking-[0.25px] text-text">
                        {title}
                    </Text>
                    <Text className="font-body text-[13px] leading-[19px] text-text-muted">
                        {accroche}
                    </Text>
                </View>

                {highlight.badges.length > 0 ? (
                    <View className="flex-row flex-wrap gap-1.5">
                        {highlight.badges.map((badge) => (
                            <Badge
                                key={badge}
                                tone={badge === 'joker' ? 'brand' : 'neutral'}
                                variant="outline">
                                {badge === 'joker'
                                    ? `×2 ${t('leagues:detail.results.highlight.badge.joker')}`
                                    : t(`leagues:detail.results.highlight.badge.${badge}`)}
                            </Badge>
                        ))}
                    </View>
                ) : null}

                {highlight.sameMatch && match ? (
                    <View className="flex-row items-center gap-[9px] rounded-sm bg-surface-sunken px-[11px] py-[9px]">
                        <TeamFlag size="sm" team={match.home_team} />
                        <Text
                            className={cn(
                                'flex-1 font-body-semibold text-[12.5px]',
                                (match.home_score ?? 0) < (match.away_score ?? 0)
                                    ? 'text-text-muted'
                                    : 'text-text',
                            )}
                            numberOfLines={1}>
                            {nameOf(match.home_team)}
                        </Text>
                        <Text className="font-display text-[20px] leading-[24px] tracking-[0.4px] text-text">
                            {match.home_score} – {match.away_score}
                        </Text>
                        <Text
                            className={cn(
                                'flex-1 text-right font-body-semibold text-[12.5px]',
                                (match.away_score ?? 0) < (match.home_score ?? 0)
                                    ? 'text-text-muted'
                                    : 'text-text',
                            )}
                            numberOfLines={1}>
                            {nameOf(match.away_team)}
                        </Text>
                        <TeamFlag size="sm" team={match.away_team} />
                    </View>
                ) : null}

                <View className="gap-2">
                    {laureates.map((laureate) => {
                        const line = (
                            <RoundHighlightLaureate
                                key={laureate.userId}
                                laureate={laureate}
                                single={single}
                                subline={
                                    highlight.sameMatch
                                        ? t(
                                              laureate.isMe
                                                  ? 'leagues:detail.results.highlight.myPrediction'
                                                  : 'leagues:detail.results.highlight.prediction',
                                              {
                                                  home: laureate.predictedHome,
                                                  away: laureate.predictedAway,
                                              },
                                          )
                                        : t('leagues:detail.results.highlight.splitLine', {
                                              match: compactMatch(
                                                  matchesById.get(laureate.matchId),
                                              ),
                                              home: laureate.predictedHome,
                                              away: laureate.predictedAway,
                                          })
                                }
                            />
                        );
                        return highlight.sameMatch ? (
                            line
                        ) : (
                            <Pressable key={laureate.userId} onPress={() => onOpen(laureate)}>
                                {line}
                            </Pressable>
                        );
                    })}
                </View>

                <View className="gap-1.5">
                    <Text className="font-body text-[12.5px] leading-[17px] text-text">
                        {storyText}
                    </Text>
                    <View className="h-1.5 flex-row gap-[3px]">
                        <View
                            className="rounded-[3px] bg-text/18"
                            style={{ flex: story.crowdCount }}
                        />
                        <View className="rounded-[3px] bg-accent" style={{ flex: story.winners }} />
                    </View>
                </View>

                <View className="-mx-3.5 flex-row items-center justify-between gap-2 border-t border-border bg-accent/5 px-3.5 py-2.5">
                    <View className="shrink flex-row items-center gap-[7px]">
                        <MessageCirclePlus color={muted} size={15} strokeWidth={1.9} />
                        <Text
                            className="shrink font-body-semibold text-[12px] text-text-muted"
                            numberOfLines={1}>
                            {audience === 'me'
                                ? t('leagues:detail.results.highlight.ctaMe')
                                : t('leagues:detail.results.highlight.cta')}
                        </Text>
                    </View>
                    <ChevronRight color={faint} size={14} strokeWidth={2.2} />
                </View>
            </Pressable>
        </Animated.View>
    );
}

/** « AUS 22 – 25 GEO » : le match d'un lauréat, quand les ex æquo divergent. */
function compactMatch(match: MatchWithTeams | undefined): string {
    if (!match) return '';
    const code = (team: MatchWithTeams['home_team']) => team?.code ?? team?.name ?? '?';
    return `${code(match.home_team)} ${match.home_score} – ${match.away_score} ${code(match.away_team)}`;
}
