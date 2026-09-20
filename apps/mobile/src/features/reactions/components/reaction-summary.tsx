import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LayoutAnimationConfig } from 'react-native-reanimated';

import { ReactionPastille } from '@/features/reactions/components/reaction-pastille';
import type { ReactionChipData } from '@/features/reactions/reactions';
import { Pressable, Text, View } from '@/tw';
import { cn } from '@/tw/variants';

type ReactionSummaryProps = {
    /** Réactions présentes sur ce prono, dans l'ordre fixe. */
    chips: ReactionChipData[];
    username: string;
    onPress: () => void;
};

/**
 * Résumé des réactions reçues par un prono, à droite de la barre de réaction :
 * les réactions présentes en pile de pastilles, puis le total. Le toucher
 * ouvre la sheet, qui dit qui a réagi et avec quoi — le détail par réaction
 * n'a donc pas à tenir sur la ligne.
 *
 * `skipEntering` : les pastilles déjà là à l'affichage de la liste ne
 * rebondissent pas toutes ensemble — seule une pastille qui APPARAÎT (une
 * réaction qu'on vient de poser) joue son entrée.
 */
export function ReactionSummary({ chips, username, onPress }: ReactionSummaryProps) {
    const { t } = useTranslation('reactions');
    const [pressed, setPressed] = useState(false);
    const total = chips.reduce((sum, chip) => sum + chip.count, 0);

    return (
        <Pressable
            accessibilityLabel={`${t('summary.open', { username })}. ${t('summary.count', { count: total })}`}
            accessibilityRole="button"
            className={cn(
                'h-7 flex-row items-center gap-[7px] rounded-pill border py-0 pl-1 pr-2.5',
                pressed ? 'border-border bg-surface-sunken' : 'border-transparent',
            )}
            hitSlop={6}
            onPress={onPress}
            onPressIn={() => setPressed(true)}
            onPressOut={() => setPressed(false)}>
            <View className="flex-row items-center pl-[7px]">
                <LayoutAnimationConfig skipEntering>
                    {chips.map((chip, index) => (
                        <ReactionPastille emoji={chip.emoji} key={chip.key} overlap={index > 0} />
                    ))}
                </LayoutAnimationConfig>
            </View>
            <Text className="font-body-bold text-[12px] text-text-muted">{total}</Text>
        </Pressable>
    );
}
