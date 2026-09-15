import { Text, View } from '@/tw';
import { cn } from '@/tw/variants';

type BadgeTone =
    | 'neutral'
    | 'brand'
    | 'accent'
    | 'live'
    | 'success'
    | 'warning'
    | 'info'
    | 'danger';
type BadgeVariant = 'solid' | 'soft' | 'outline';

type BadgeProps = {
    children: string;
    tone?: BadgeTone;
    variant?: BadgeVariant;
    /** Point coloré avant le texte (ex. statut live) */
    dot?: boolean;
};

const toneClasses: Record<
    BadgeTone,
    { solid: string; soft: string; outline: string; text: string; textOnSolid: string; dot: string }
> = {
    neutral: {
        solid: 'bg-text-muted',
        soft: 'bg-text-muted/15',
        outline: 'border-text-muted',
        text: 'text-text-muted',
        textOnSolid: 'text-surface',
        dot: 'bg-text-muted',
    },
    brand: {
        solid: 'bg-brand',
        soft: 'bg-brand/15',
        outline: 'border-brand',
        text: 'text-brand',
        textOnSolid: 'text-on-brand',
        dot: 'bg-brand',
    },
    accent: {
        solid: 'bg-accent',
        soft: 'bg-accent/15',
        outline: 'border-accent',
        text: 'text-accent',
        textOnSolid: 'text-on-accent',
        dot: 'bg-accent',
    },
    live: {
        solid: 'bg-live',
        soft: 'bg-live/15',
        outline: 'border-live',
        text: 'text-live',
        textOnSolid: 'text-on-accent',
        dot: 'bg-live',
    },
    success: {
        solid: 'bg-success',
        soft: 'bg-success/15',
        outline: 'border-success',
        text: 'text-success',
        textOnSolid: 'text-on-accent',
        dot: 'bg-success',
    },
    warning: {
        solid: 'bg-warning',
        soft: 'bg-warning/15',
        outline: 'border-warning',
        text: 'text-warning',
        textOnSolid: 'text-on-accent',
        dot: 'bg-warning',
    },
    info: {
        solid: 'bg-info',
        soft: 'bg-info/15',
        outline: 'border-info',
        text: 'text-info',
        textOnSolid: 'text-on-accent',
        dot: 'bg-info',
    },
    danger: {
        solid: 'bg-danger',
        soft: 'bg-danger/15',
        outline: 'border-danger',
        text: 'text-danger',
        textOnSolid: 'text-on-danger',
        dot: 'bg-danger',
    },
};

/** Badge pill compact du design system (22px de haut, texte 11px). */
export function Badge({ children, tone = 'neutral', variant = 'soft', dot = false }: BadgeProps) {
    const t = toneClasses[tone];
    const textColor = variant === 'solid' ? t.textOnSolid : t.text;

    return (
        <View
            className={cn(
                'h-[22px] flex-row items-center gap-[5px] self-start rounded-pill px-[9px]',
                variant === 'solid' && t.solid,
                variant === 'soft' && t.soft,
                variant === 'outline' && cn('border-[1.5px]', t.outline),
            )}>
            {dot ? (
                <View
                    className={cn(
                        'h-1.5 w-1.5 rounded-pill',
                        variant === 'solid' ? 'bg-surface' : t.dot,
                    )}
                />
            ) : null}
            <Text className={cn('font-body-semibold text-[11px] tracking-[0.22px]', textColor)}>
                {children}
            </Text>
        </View>
    );
}
