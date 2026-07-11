import { Pressable, View } from '@/tw';
import { cn } from '@/tw/variants';

type SwitchProps = {
    checked: boolean;
    onToggle: () => void;
    accessibilityLabel: string;
    disabled?: boolean;
};

/**
 * Interrupteur du design system (maquette Réglages) : piste 46×28, pouce
 * blanc 22, accent grenat quand actif. Grand frère du BonusToggle des cartes
 * de prono (38×22, colocalisé à predictions).
 */
export function Switch({ checked, onToggle, accessibilityLabel, disabled = false }: SwitchProps) {
    return (
        <Pressable
            accessibilityLabel={accessibilityLabel}
            accessibilityRole="switch"
            accessibilityState={{ checked, disabled }}
            className="p-0.5"
            disabled={disabled}
            onPress={onToggle}>
            <View
                className={cn(
                    'h-[28px] w-[46px] rounded-pill',
                    checked ? 'bg-accent' : 'bg-text/20',
                    disabled && 'opacity-55',
                )}>
                <View
                    className={cn(
                        'absolute top-[3px] h-[22px] w-[22px] rounded-pill bg-white tc-shadow-sm',
                        checked ? 'left-[21px]' : 'left-[3px]',
                    )}
                />
            </View>
        </Pressable>
    );
}
