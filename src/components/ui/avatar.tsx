import { Text, View } from '@/tw';
import { cn } from '@/tw/variants';

type AvatarSize = 'sm' | 'md' | 'lg';

type AvatarProps = {
    /** Nom affiché en initiales (2 premières lettres des 2 premiers mots) */
    name: string;
    size?: AvatarSize;
    /** Anneau accent autour de l'avatar (profil courant) */
    ring?: boolean;
};

const sizeClasses: Record<AvatarSize, { box: string; text: string }> = {
    sm: { box: 'h-8 w-8', text: 'text-[12px]' },
    md: { box: 'h-10 w-10', text: 'text-[15px]' },
    lg: { box: 'h-14 w-14', text: 'text-[21px]' },
};

/** Avatar initiales du design system (pastille brand, pas de photo au MVP). */
export function Avatar({ name, size = 'md', ring = false }: AvatarProps) {
    const initials =
        name
            .split(' ')
            .filter(Boolean)
            .slice(0, 2)
            .map((word) => word[0])
            .join('')
            .toUpperCase() || '?';
    const s = sizeClasses[size];

    const face = (
        <View className={cn('items-center justify-center rounded-pill bg-brand', s.box)}>
            <Text className={cn('font-body-bold text-on-brand', s.text)}>{initials}</Text>
        </View>
    );

    if (!ring) {
        return face;
    }
    return <View className="rounded-pill border-2 border-accent p-[2px]">{face}</View>;
}
