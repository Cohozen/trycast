import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { MatchWithTeams, TeamRow } from '@/features/matches/types';
import type { PredictionRow } from '@/features/predictions/types';
import {
    isJokerScored,
    parseBreakdown,
    type Verdict,
    verdictOf,
} from '@/features/predictions/verdict';
import { palette } from '@/tw/palette';
import { Pressable, Text, View } from '@/tw';
import { cn } from '@/tw/variants';

type ProfilePredictionCardProps = {
    /** Match terminé (l'onglet Pronos ne liste que ceux-là). */
    match: MatchWithTeams;
    prediction: PredictionRow | undefined;
    /** Toute la carte : page de détail du match. */
    onOpenMatch: () => void;
    /** Bloc points seul : sheet du détail des points (prono scoré). */
    onOpenPoints: (prediction: PredictionRow) => void;
};

const VERDICT_TONES: Record<Verdict, { dot: string; text: string; score: string }> = {
    exact: { dot: 'bg-accent', text: 'text-accent', score: 'text-accent' },
    good: { dot: 'bg-success', text: 'text-success', score: 'text-text' },
    missed: { dot: 'bg-text-faint', text: 'text-text-faint', score: 'text-text-muted' },
    pending: { dot: 'bg-text-faint', text: 'text-text-faint', score: 'text-text-muted' },
};

/**
 * Carte compacte d'un prono dans l'onglet Pronos du profil (DS Profil du
 * 2026-09-24) : le prono en grand entre les deux équipes, le verdict, le
 * score final et les bonus dessous, les points à droite. Toute la carte
 * ouvre le match ; le bloc points seul ouvre le détail du barème.
 */
export function ProfilePredictionCard({
    match,
    prediction,
    onOpenMatch,
    onOpenPoints,
}: ProfilePredictionCardProps) {
    const { t } = useTranslation(['profile', 'predictions']);
    const [pressed, setPressed] = useState(false);

    const verdict = prediction ? verdictOf(prediction) : null;
    const tone = VERDICT_TONES[verdict ?? 'missed'];
    const scored = prediction != null && prediction.points_awarded !== null;
    const points = prediction?.points_awarded ?? 0;
    const positive = scored && points > 0;

    const chips: { key: string; label: string; className: string; textClassName: string }[] = [];
    if (prediction) {
        const neutral = {
            className: 'border-border-strong',
            textClassName: 'text-text-muted',
        };
        if (prediction.predicted_bonus_off_home) {
            chips.push({
                key: 'off-home',
                label: t('profile:predictions.card.bonusOff', { code: codeOf(match.home_team) }),
                ...neutral,
            });
        }
        if (prediction.predicted_bonus_off_away) {
            chips.push({
                key: 'off-away',
                label: t('profile:predictions.card.bonusOff', { code: codeOf(match.away_team) }),
                ...neutral,
            });
        }
        if ((parseBreakdown(prediction)?.defensiveBonusPoints ?? 0) > 0) {
            chips.push({
                key: 'defensive',
                label: t('profile:predictions.card.defensive'),
                className: 'border-info/45',
                textClassName: 'text-info',
            });
        }
        // Joker = vert marque, jamais grenat (règle actée)
        if (isJokerScored(prediction)) {
            chips.push({
                key: 'joker',
                label: t('profile:predictions.card.joker'),
                className: 'border-brand/45',
                textClassName: 'text-brand',
            });
        }
    }

    // Tricode + carré aux couleurs de l'équipe, carré côté score
    const teamTag = (team: TeamRow | null, side: 'home' | 'away') => {
        const square = (
            <View
                className="h-2 w-2 rounded-[2px]"
                style={{ backgroundColor: team?.color ?? palette['ink-400'].light }}
            />
        );
        return (
            <View className="flex-row items-center gap-1.5">
                {side === 'home' ? square : null}
                <Text className="font-body-bold text-[13px] tracking-[0.39px] text-text">
                    {codeOf(team)}
                </Text>
                {side === 'away' ? square : null}
            </View>
        );
    };

    const verdictLabel = !prediction
        ? t('profile:predictions.card.noProno')
        : t(`predictions:verdict.${verdict ?? 'pending'}`);

    return (
        <Pressable
            accessibilityRole="button"
            className={cn(
                'will-change-variable flex-row items-center gap-3 overflow-hidden rounded-md bg-surface py-2.5 pl-3.5 pr-3',
                verdict === 'exact'
                    ? 'border-[1.5px] border-accent/45 tc-glow-accent'
                    : 'border border-border tc-shadow-sm',
                pressed && 'scale-[0.985]',
            )}
            onPress={onOpenMatch}
            onPressIn={() => setPressed(true)}
            onPressOut={() => setPressed(false)}>
            <View className="min-w-0 flex-1 gap-1.5">
                <View className="flex-row items-center gap-2.5">
                    {teamTag(match.home_team, 'home')}
                    <Text
                        className={cn(
                            'font-display text-[24px] leading-[26px]',
                            prediction ? tone.score : 'text-text-faint',
                        )}>
                        {prediction
                            ? `${prediction.predicted_home_score} – ${prediction.predicted_away_score}`
                            : '– – –'}
                    </Text>
                    {teamTag(match.away_team, 'away')}
                </View>
                <View className="flex-row flex-wrap items-center gap-x-2 gap-y-1">
                    <View className="flex-row items-center gap-1.5">
                        <View className={cn('h-1.5 w-1.5 rounded-pill', tone.dot)} />
                        <Text className={cn('font-body-bold text-[11.5px]', tone.text)}>
                            {verdictLabel}
                        </Text>
                    </View>
                    <Text className="font-body-semibold text-[11.5px] text-text-muted">
                        {t('profile:predictions.card.final', {
                            score: `${match.home_score ?? '–'} – ${match.away_score ?? '–'}`,
                        })}
                    </Text>
                    {chips.map((chip) => (
                        <View
                            className={cn('rounded-pill border px-1.5 py-px', chip.className)}
                            key={chip.key}>
                            <Text
                                className={cn(
                                    'font-body-bold text-[10.5px] tracking-[0.2px]',
                                    chip.textClassName,
                                )}>
                                {chip.label}
                            </Text>
                        </View>
                    ))}
                </View>
            </View>

            <Pressable
                accessibilityLabel={scored ? t('profile:predictions.card.openPoints') : undefined}
                accessibilityRole={scored ? 'button' : undefined}
                className={cn(
                    'min-w-[58px] items-center gap-px rounded-sm px-2.5 py-1.5',
                    positive
                        ? 'border border-accent/30 bg-accent/15'
                        : 'border border-border bg-surface-sunken',
                )}
                disabled={!scored}
                hitSlop={6}
                onPress={() => prediction && onOpenPoints(prediction)}>
                <Text
                    className={cn(
                        'font-display text-[24px] leading-[26px]',
                        positive ? 'text-accent' : 'text-text-faint',
                    )}>
                    {!prediction ? '—' : !scored ? '–' : `+${points}`}
                </Text>
                <Text
                    className={cn(
                        'font-body-bold text-[9px] uppercase tracking-[0.54px]',
                        positive ? 'text-accent' : 'text-text-faint',
                    )}>
                    pts
                </Text>
            </Pressable>

            {/* Pas de prono : carte voilée, toujours cliquable vers le match */}
            {prediction ? null : (
                <View
                    className="absolute bottom-0 left-0 right-0 top-0 bg-surface-sunken/60"
                    pointerEvents="none"
                />
            )}
        </Pressable>
    );
}

function codeOf(team: TeamRow | null): string {
    return team?.code ?? team?.name ?? '?';
}
