import { Text } from '@/tw';
import { cn } from '@/tw/variants';

type JokerMarkProps = {
    /** 13 px à côté d'une valeur (cellule 1/N/2), 12 px dans un libellé. */
    size?: 'md' | 'sm';
};

/**
 * « ×2 » vert posé à côté d'une valeur en points : les points restent
 * affichés en valeur de base, la marque dit qu'ils seront doublés.
 */
export function JokerMark({ size = 'md' }: JokerMarkProps) {
    return (
        <Text
            className={cn(
                'font-display tracking-[0.26px] text-brand',
                size === 'md' ? 'text-[13px] leading-[16px]' : 'text-[12px] leading-[15px]',
            )}>
            ×2
        </Text>
    );
}
