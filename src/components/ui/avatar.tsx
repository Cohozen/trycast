import { Image } from 'expo-image';
import { StyleSheet } from 'react-native';

import { Text, View } from '@/tw';
import { cn } from '@/tw/variants';

type AvatarSize = 'sm' | 'md' | 'lg';

type AvatarProps = {
    /** Nom affiché en initiales (2 premières lettres des 2 premiers mots) */
    name: string;
    /** Photo de profil ; repli sur les initiales si absente ou en erreur */
    uri?: string | null;
    size?: AvatarSize;
    /** Anneau accent autour de l'avatar (profil courant) */
    ring?: boolean;
};

const sizeClasses: Record<AvatarSize, { box: string; text: string }> = {
    sm: { box: 'h-8 w-8', text: 'text-[12px]' },
    md: { box: 'h-10 w-10', text: 'text-[15px]' },
    lg: { box: 'h-14 w-14', text: 'text-[21px]' },
};

/**
 * Avatar du design system : pastille brand avec initiales, surchargée par la
 * photo de profil quand elle existe. Les initiales restent la couche de fond →
 * si la photo échoue au chargement, elles réapparaissent sans code d'erreur.
 */
export function Avatar({ name, uri, size = 'md', ring = false }: AvatarProps) {
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
        <View
            className={cn(
                'items-center justify-center overflow-hidden rounded-pill bg-brand',
                s.box,
            )}>
            <Text className={cn('font-body-bold text-on-brand', s.text)}>{initials}</Text>
            {uri ? (
                <Image
                    cachePolicy="memory-disk"
                    contentFit="cover"
                    source={{ uri }}
                    style={StyleSheet.absoluteFill}
                    transition={150}
                />
            ) : null}
        </View>
    );

    if (!ring) {
        return face;
    }
    return <View className="rounded-pill border-2 border-accent p-[2px]">{face}</View>;
}
