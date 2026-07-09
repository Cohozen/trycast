import { Pressable, Text, View } from '@/tw';
import { cn } from '@/tw/variants';

type ToastTone = 'neutral' | 'success' | 'accent' | 'live';

type ToastProps = {
    message: string;
    tone?: ToastTone;
    /** Icône optionnelle, teintée de la couleur du ton */
    icon?: React.ReactNode;
    /** Libellé d'action optionnel (ex. « Annuler ») */
    action?: string;
    onAction?: () => void;
};

const toneClasses: Record<ToastTone, string> = {
    neutral: 'border-l-text',
    success: 'border-l-success',
    accent: 'border-l-accent',
    live: 'border-l-live',
};

/**
 * Toast de micro-feedback : carte surface avec liseré coloré à gauche.
 * Purement présentationnel — le positionnement (absolute bottom) et la
 * disparition sont à la charge de l'écran appelant.
 */
export function Toast({ message, tone = 'neutral', icon, action, onAction }: ToastProps) {
    return (
        <View
            accessibilityRole="alert"
            className={cn(
                'w-full max-w-[380px] flex-row items-center gap-3 rounded-md border border-border border-l-[3px] bg-surface px-3.5 py-3 tc-shadow-lg',
                toneClasses[tone],
            )}>
            {icon}
            <Text className="flex-1 font-body text-[14px] text-text">{message}</Text>
            {action ? (
                <Pressable accessibilityRole="button" onPress={onAction}>
                    <Text className="font-body-semibold text-[13px] text-accent">{action}</Text>
                </Pressable>
            ) : null}
        </View>
    );
}
