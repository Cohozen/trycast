import { View, type ViewProps } from '@/tw';
import { cn } from '@/tw/variants';

/**
 * Carte du design system : surface, bordure hairline, radius-md, ombre
 * discrète (« elevation is subtle — this is a mobile product »).
 */
export function Card({ className, ...props }: ViewProps) {
    return (
        <View
            className={cn('rounded-md border border-border bg-surface p-4 tc-shadow-sm', className)}
            {...props}
        />
    );
}
