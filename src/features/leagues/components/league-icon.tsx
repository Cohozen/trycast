import { leagueColorOf } from '@/features/leagues/colors';
import { initialsOf } from '@/features/leagues/initials';
import { Text, View } from '@/tw';
import { cn } from '@/tw/variants';

type LeagueIconSize = 'md' | 'lg';

type LeagueIconProps = {
    name: string;
    /** Couleur stockée en base (hex de la palette fermée) ; repli sur le défaut. */
    color: string | null | undefined;
    size?: LeagueIconSize;
};

const sizeClasses: Record<LeagueIconSize, { box: string; text: string }> = {
    md: { box: 'h-[58px] w-[58px]', text: 'text-[26px]' },
    lg: { box: 'h-[76px] w-[76px]', text: 'text-[32px]' },
};

/**
 * Pavé d'identité d'une ligue : initiales Anton sur fond de la couleur choisie
 * à la création. La couleur vient de la base (donnée, pas token) → posée en
 * style ; le texte crème reste lisible sur toute la palette, dans les deux
 * thèmes.
 */
export function LeagueIcon({ name, color, size = 'md' }: LeagueIconProps) {
    const s = sizeClasses[size];
    return (
        <View
            className={cn('items-center justify-center rounded-md tc-shadow-sm', s.box)}
            style={{ backgroundColor: leagueColorOf(color) }}>
            <Text className={cn('font-display tracking-[0.5px] text-cream-100', s.text)}>
                {initialsOf(name)}
            </Text>
        </View>
    );
}
