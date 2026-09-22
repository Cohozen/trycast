import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View as RNView } from 'react-native';

import { Avatar } from '@/components/ui/avatar';
import { Popover, type PopoverAnchor } from '@/components/ui/popover';
import { JokerBadge } from '@/features/jokers/components/joker-badge';
import type { MatchWithTeams } from '@/features/matches/types';
import type { MemberPrediction } from '@/features/predictions/types';
import { ReactionPicker } from '@/features/reactions/components/reaction-picker';
import { ReactionSummary } from '@/features/reactions/components/reaction-summary';
import { ReactionTrigger } from '@/features/reactions/components/reaction-trigger';
import {
    isReactionKey,
    parseReactionCounts,
    type ReactionKey,
    toReactionChips,
} from '@/features/reactions/reactions';
import { Pressable, Text, View } from '@/tw';
import { cn } from '@/tw/variants';

type MemberPredictionRowProps = {
    entry: MemberPrediction;
    /** Met en évidence la ligne de l'utilisateur connecté. */
    isMe: boolean;
    /** Ligne visée à l'arrivée (coup de la journée) : contour grenat bref. */
    highlighted?: boolean;
    match: MatchWithTeams;
    /** Ouvre le profil public du membre. Absent sur ma propre ligne. */
    onPress?: () => void;
    /**
     * Pose, remplace ou retire (null) ma réaction à ce prono. Absent = pas de
     * réactions sur cette liste.
     */
    onReact?: (next: ReactionKey | null) => void;
    /** Ouvre la sheet des réactions reçues par ce prono. */
    onOpenReactions?: () => void;
};

// Le popover s'aligne sur la fin de l'avatar (padding de ligne + avatar sm),
// les puces sur le début du pseudo (+ la gouttière gap-3, 10,5 px en natif).
const POPOVER_OFFSET_X = 44;

/**
 * Ligne d'un membre de la ligue sur la page de détail (vue Pronos, après
 * kickoff uniquement) : avatar, pseudo, pill du prono (« — » pour un membre
 * sans prono, décision 2026-07-13) et points gagnés une fois le match scoré.
 * Le marqueur « Score exact » est dérivé côté client : la RPC n'expose pas
 * le breakdown des autres.
 *
 * Réactions (v1.1.0) : puces sous la ligne dès qu'il y en a — y compris sur
 * ma ligne, qui les reçoit sans pouvoir réagir. Sur le prono d'un autre,
 * l'icône de fin de ligne ou un appui long ouvre le popover des quatre
 * réactions ; le tap garde son rôle, ouvrir le profil.
 */
export function MemberPredictionRow({
    entry,
    isMe,
    highlighted = false,
    match,
    onPress,
    onReact,
    onOpenReactions,
}: MemberPredictionRowProps) {
    const { t } = useTranslation(['predictions', 'leagues', 'reactions']);
    const rowRef = useRef<RNView>(null);
    const [anchor, setAnchor] = useState<PopoverAnchor | null>(null);

    const hasPrediction =
        entry.predicted_home_score !== null && entry.predicted_away_score !== null;
    const exact =
        hasPrediction &&
        match.status === 'finished' &&
        match.home_score !== null &&
        match.away_score !== null &&
        entry.predicted_home_score === match.home_score &&
        entry.predicted_away_score === match.away_score;
    const scored = entry.points_awarded !== null;

    const myReaction = isReactionKey(entry.my_reaction) ? entry.my_reaction : null;
    const chips = toReactionChips(parseReactionCounts(entry.reactions), myReaction);
    // Pas de réaction à son propre prono ni à une ligne « — » (le serveur
    // refuse de toute façon : self_reaction, no_prediction).
    const canReact = !!onReact && !isMe && hasPrediction;

    const openPicker = () => {
        rowRef.current?.measureInWindow((x, y, width, height) => {
            setAnchor({ x, y, width, height });
        });
    };
    const pick = (key: ReactionKey) => {
        setAnchor(null);
        onReact?.(key === myReaction ? null : key);
    };

    const content = (
        <RNView collapsable={false} ref={rowRef}>
            <View
                className={cn(
                    'gap-[7px] rounded-md border bg-surface px-3.5 py-2.5',
                    isMe ? 'border-accent/40 bg-accent/10' : 'border-border',
                    highlighted && 'border-accent',
                )}>
                <View className="flex-row items-center gap-3">
                    <Avatar name={entry.username} ring={isMe} size="sm" uri={entry.avatar_url} />
                    <View className="min-w-0 flex-1 gap-1">
                        <Text
                            className={cn(
                                'text-[14px]',
                                isMe ? 'font-body-bold text-text' : 'font-body-semibold text-text',
                            )}
                            numberOfLines={1}>
                            {entry.username}
                        </Text>
                        {exact ? (
                            <View className="self-start rounded-pill bg-accent/15 px-2 py-px">
                                <Text className="font-body-bold text-[10px] text-accent">
                                    {t('predictions:verdict.exact')}
                                </Text>
                            </View>
                        ) : null}
                    </View>
                    {entry.is_joker ? <JokerBadge /> : null}
                    <View className="rounded-pill bg-surface-sunken px-2.5 py-0.5">
                        <Text className="font-body-bold text-[13px] text-text-muted">
                            {hasPrediction
                                ? `${entry.predicted_home_score} – ${entry.predicted_away_score}`
                                : '—'}
                        </Text>
                    </View>
                    {scored ? (
                        <View className="min-w-[46px] flex-row items-baseline justify-end gap-0.5">
                            <Text
                                className={cn(
                                    'font-display text-[20px] leading-[21px]',
                                    (entry.points_awarded ?? 0) > 0
                                        ? 'text-accent'
                                        : 'text-text-faint',
                                )}>
                                +{entry.points_awarded}
                            </Text>
                            <Text
                                className={cn(
                                    'font-body-bold text-[10px]',
                                    (entry.points_awarded ?? 0) > 0
                                        ? 'text-accent'
                                        : 'text-text-faint',
                                )}>
                                pts
                            </Text>
                        </View>
                    ) : null}
                </View>
                {/* Barre de réaction : mon bouton à gauche, le résumé à droite
                    (maquette « TryCast Reactions »). Absente quand il n'y a ni
                    l'un ni l'autre — ma ligne garde le résumé, sans bouton. */}
                {canReact || (chips.length > 0 && onOpenReactions) ? (
                    <View className="min-h-8 flex-row items-center gap-2.5 pl-[42px]">
                        {canReact ? (
                            <ReactionTrigger
                                myReaction={myReaction}
                                onPress={openPicker}
                                open={anchor !== null}
                                username={entry.username}
                            />
                        ) : null}
                        <View className="flex-1" />
                        {chips.length > 0 && onOpenReactions ? (
                            <ReactionSummary
                                chips={chips}
                                onPress={onOpenReactions}
                                username={entry.username}
                            />
                        ) : null}
                    </View>
                ) : null}
            </View>
        </RNView>
    );

    const popover = canReact ? (
        <Popover
            accessibilityLabel={t('reactions:picker.label')}
            anchor={anchor}
            offsetX={POPOVER_OFFSET_X}
            onClose={() => setAnchor(null)}>
            <ReactionPicker onPick={pick} selected={myReaction} />
        </Popover>
    ) : null;

    if (!onPress) {
        return (
            <>
                {content}
                {popover}
            </>
        );
    }
    return (
        <>
            <Pressable
                accessibilityActions={
                    canReact
                        ? [{ name: 'longpress', label: t('reactions:picker.label') }]
                        : undefined
                }
                accessibilityLabel={t('leagues:leaderboard.row.openProfile', {
                    username: entry.username,
                })}
                accessibilityRole="button"
                delayLongPress={450}
                onAccessibilityAction={(event) => {
                    if (event.nativeEvent.actionName === 'longpress') openPicker();
                }}
                onLongPress={canReact ? openPicker : undefined}
                onPress={onPress}>
                {content}
            </Pressable>
            {popover}
        </>
    );
}
