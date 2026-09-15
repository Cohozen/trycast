import { Pressable, View } from '@/tw';
import { cn } from '@/tw/variants';

type BonusToggleProps = {
    checked: boolean;
    onToggle: () => void;
    accessibilityLabel: string;
};

/**
 * Mini-interrupteur « bonus offensif » d'une équipe (maquette MesMatchs) :
 * piste 38×22, pouce blanc, accent grenat quand actif.
 */
export function BonusToggle({ checked, onToggle, accessibilityLabel }: BonusToggleProps) {
    return (
        <Pressable
            accessibilityLabel={accessibilityLabel}
            accessibilityRole="switch"
            accessibilityState={{ checked }}
            className="p-0.5"
            onPress={onToggle}>
            <View
                className={cn(
                    'h-[22px] w-[38px] rounded-pill',
                    checked ? 'bg-accent' : 'bg-text/20',
                )}>
                <View
                    className={cn(
                        'absolute top-0.5 h-[18px] w-[18px] rounded-pill bg-white tc-shadow-sm',
                        checked ? 'left-[18px]' : 'left-0.5',
                    )}
                />
            </View>
        </Pressable>
    );
}
