import { useTranslation } from 'react-i18next';
import { LayoutAnimationConfig } from 'react-native-reanimated';

import { ReactionChip } from '@/features/reactions/components/reaction-chip';
import type { ReactionChipData } from '@/features/reactions/reactions';
import { Pressable } from '@/tw';

type ReactionSummaryProps = {
    chips: ReactionChipData[];
    username: string;
    onPress: () => void;
};

/**
 * Rangée de puces sous la ligne d'un membre ; la toucher ouvre la sheet des
 * réactions. Passe à la ligne quand la place manque, jamais de troncature.
 * `skipEntering` : les puces présentes à l'affichage de la liste ne
 * rebondissent pas toutes ensemble — seule une puce qui APPARAÎT (une
 * réaction qu'on vient de poser) joue son entrée.
 */
export function ReactionSummary({ chips, username, onPress }: ReactionSummaryProps) {
    const { t } = useTranslation('reactions');
    const detail = chips
        .map((chip) => t('summary.chip', { label: t(`labels.${chip.key}`), value: chip.count }))
        .join(', ');

    return (
        <Pressable
            accessibilityLabel={`${t('summary.open', { username })}. ${detail}`}
            accessibilityRole="button"
            className="flex-row flex-wrap items-center gap-[5px] self-start"
            hitSlop={6}
            onPress={onPress}>
            <LayoutAnimationConfig skipEntering>
                {chips.map((chip) => (
                    <ReactionChip
                        count={chip.count}
                        emoji={chip.emoji}
                        key={chip.key}
                        mine={chip.mine}
                    />
                ))}
            </LayoutAnimationConfig>
        </Pressable>
    );
}
