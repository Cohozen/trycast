import { leagueColorOf } from '@/features/leagues/colors';
import { initialsOf } from '@/features/leagues/initials';
import { Text, View } from '@/tw';
import { cn } from '@/tw/variants';

type LeagueIconSize = 'sm' | 'option' | 'trigger' | 'list' | 'md' | 'lg';

type LeagueIconProps = {
    name: string;
    /** Couleur stockée en base (hex de la palette fermée) ; repli sur le défaut. */
    color: string | null | undefined;
    size?: LeagueIconSize;
};

const sizeClasses: Record<LeagueIconSize, { box: string; text: string }> = {
    // sm : titre compact de la barre native (header replié)
    sm: { box: 'h-[26px] w-[26px] rounded-[8px]', text: 'text-[13px]' },
    // option / trigger : sélecteur de ligue (liste, puis déclencheur) ;
    // list : lignes de l'onglet Ligues du profil (DS 2026-09-24)
    option: { box: 'h-[32px] w-[32px] rounded-sm', text: 'text-[14px]' },
    trigger: { box: 'h-[36px] w-[36px] rounded-sm', text: 'text-[16px]' },
    list: { box: 'h-[40px] w-[40px] rounded-sm', text: 'text-[17px]' },
    md: { box: 'h-[58px] w-[58px]', text: 'text-[26px]' },
    lg: { box: 'h-[76px] w-[76px]', text: 'text-[32px]' },
};

/**
 * Pavé d'identité d'une ligue : initiales Anton sur fond de la couleur choisie
 * à la création. La couleur vient de la base (donnée, pas token) → posée en
 * style ; le texte sable reste lisible sur toute la palette, dans les deux
 * thèmes (primitive figée, pas un token sémantique qui basculerait en dark).
 */
export function LeagueIcon({ name, color, size = 'md' }: LeagueIconProps) {
    const s = sizeClasses[size];
    return (
        <View
            className={cn('items-center justify-center rounded-md tc-shadow-sm', s.box)}
            style={{ backgroundColor: leagueColorOf(color) }}>
            <Text className={cn('font-display tracking-[0.5px] text-sand-050', s.text)}>
                {initialsOf(name)}
            </Text>
        </View>
    );
}
