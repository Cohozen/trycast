import { useTranslation } from 'react-i18next';

import { Pressable, ScrollView, Text, View } from '@/tw';
import { cn } from '@/tw/variants';

export type RoundStripItem = {
    /** Clé stable de la journée (libellé brut de matches.round). */
    key: string;
    /** Libellé brut (numérique dans les données réelles : « 1 », « 2 »…). */
    label: string;
    /** Au moins un match terminé (des points existent). */
    played: boolean;
    /** Dernière journée jouée : cerclée quand elle n'est pas sélectionnée. */
    emphasized?: boolean;
};

type RoundStripProps = {
    items: RoundStripItem[];
    selected: string;
    onSelect: (key: string) => void;
};

/**
 * Bande horizontale de sélection de journée (maquette Détail Ligue, onglet
 * Résultats) : pilules verticales « J n » — sélection accent avec glow, point
 * sous les journées jouées, journées à venir estompées mais sélectionnables
 * (elles mènent à l'état vide « pas encore jouée »).
 */
export function RoundStrip({ items, selected, onSelect }: RoundStripProps) {
    const { t } = useTranslation(['leagues']);

    return (
        <ScrollView
            className="flex-none"
            contentContainerClassName="gap-2 px-0.5 py-0.5"
            horizontal
            showsHorizontalScrollIndicator={false}>
            {items.map((item) => {
                const active = item.key === selected;
                const numeric = /^\d+$/.test(item.label);
                return (
                    <Pressable
                        accessibilityRole="button"
                        accessibilityState={{ selected: active }}
                        className={cn(
                            'w-[54px] items-center justify-center gap-[5px] rounded-pill border-[1.5px] border-transparent py-2',
                            active && 'bg-accent tc-glow-accent',
                            !active && item.emphasized && 'border-border-strong bg-surface',
                            !active && !item.played && 'opacity-50',
                        )}
                        key={item.key}
                        onPress={() => onSelect(item.key)}>
                        {numeric ? (
                            <>
                                <Text
                                    className={cn(
                                        'font-body-bold text-[10px] uppercase tracking-[0.8px]',
                                        active ? 'text-on-accent/80' : 'text-text-faint',
                                    )}>
                                    {t('leagues:detail.results.roundShort')}
                                </Text>
                                <Text
                                    className={cn(
                                        'font-display text-[22px] leading-[23px]',
                                        active ? 'text-on-accent' : 'text-text',
                                    )}>
                                    {item.label}
                                </Text>
                            </>
                        ) : (
                            <Text
                                className={cn(
                                    'py-1 font-display text-[14px]',
                                    active ? 'text-on-accent' : 'text-text',
                                )}
                                numberOfLines={1}>
                                {item.label}
                            </Text>
                        )}
                        <View
                            className={cn(
                                'h-[5px] w-[5px] rounded-pill',
                                item.played
                                    ? active
                                        ? 'bg-on-accent'
                                        : 'bg-accent'
                                    : 'bg-transparent',
                            )}
                        />
                    </Pressable>
                );
            })}
        </ScrollView>
    );
}
