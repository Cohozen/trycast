import { SmilePlus } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import { Pressable, useThemeColor } from '@/tw';
import { cn } from '@/tw/variants';

type ReactionTriggerProps = {
    username: string;
    /** Le popover est ouvert sur cette ligne. */
    open: boolean;
    onPress: () => void;
};

/**
 * Icône « réagir » en fin de ligne. 32 px dessinés, cible tactile de 44 pt
 * par le hitSlop (la maquette la fait déborder sur le padding de la ligne).
 * Discrète au repos (text-faint), affirmée tant que le popover est ouvert.
 */
export function ReactionTrigger({ username, open, onPress }: ReactionTriggerProps) {
    const { t } = useTranslation('reactions');
    const faintColor = useThemeColor('text-faint');
    const textColor = useThemeColor('text');

    return (
        <Pressable
            accessibilityLabel={t('trigger', { username })}
            accessibilityRole="button"
            accessibilityState={{ expanded: open }}
            className={cn(
                '-my-1.5 -mr-1 h-8 w-8 items-center justify-center rounded-pill',
                open ? 'bg-surface-sunken' : 'bg-transparent',
            )}
            hitSlop={6}
            onPress={onPress}>
            <SmilePlus color={open ? textColor : faintColor} size={19} strokeWidth={1.9} />
        </Pressable>
    );
}
