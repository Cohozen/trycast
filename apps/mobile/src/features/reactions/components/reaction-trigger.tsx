import { SmilePlus } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ReactionEmoji } from '@/features/reactions/components/reaction-emoji';
import { type ReactionKey, reactionEmoji } from '@/features/reactions/reactions';
import { Pressable, useThemeColor } from '@/tw';
import { cn } from '@/tw/variants';

type ReactionTriggerProps = {
    username: string;
    /** Ma réaction sur ce prono : le bouton la porte à la place du sourire. */
    myReaction: ReactionKey | null;
    /** Le popover est ouvert sur cette ligne. */
    open: boolean;
    onPress: () => void;
};

/**
 * Bouton « réagir », à gauche de la barre de réaction. Tant que je n'ai pas
 * réagi, c'est un sourire dans un contour pointillé — une place à remplir ;
 * une fois ma réaction posée, le bouton l'affiche dans un contour d'encre
 * plein. C'est là que se lit « ma » réaction, plus dans le résumé.
 *
 * 32 px dessinés, cible tactile de 44 pt par le hitSlop.
 */
export function ReactionTrigger({ username, myReaction, open, onPress }: ReactionTriggerProps) {
    const { t } = useTranslation('reactions');
    const [pressed, setPressed] = useState(false);
    const faintColor = useThemeColor('text-faint');
    const textColor = useThemeColor('text');

    return (
        <Pressable
            accessibilityLabel={
                myReaction
                    ? t('triggerMine', { username, label: t(`labels.${myReaction}`) })
                    : t('trigger', { username })
            }
            accessibilityRole="button"
            accessibilityState={{ expanded: open }}
            className={cn(
                // will-change-variable : cf. button.tsx. Échelle en littéral
                'will-change-variable h-8 w-8 items-center justify-center rounded-pill border-[1.5px]',
                myReaction
                    ? 'border-text/40 bg-surface-sunken'
                    : cn(
                          'border-dashed bg-transparent',
                          open ? 'border-border-strong' : 'border-border',
                      ),
                pressed && 'scale-[0.94] bg-surface-sunken',
            )}
            hitSlop={6}
            onPress={onPress}
            onPressIn={() => setPressed(true)}
            onPressOut={() => setPressed(false)}>
            {myReaction ? (
                <ReactionEmoji emoji={reactionEmoji(myReaction)} size="trigger" />
            ) : (
                <SmilePlus color={open ? textColor : faintColor} size={19} strokeWidth={1.9} />
            )}
        </Pressable>
    );
}
