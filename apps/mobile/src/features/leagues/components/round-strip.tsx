import { Trophy } from 'lucide-react-native';
import { Fragment } from 'react';
import { useTranslation } from 'react-i18next';

import type { RoundStripItem } from '@/features/leagues/types';
import { Pressable, ScrollView, Text, useThemeColor, View } from '@/tw';
import { cn } from '@/tw/variants';

type RoundStripProps = {
    items: RoundStripItem[];
    selected: string;
    onSelect: (key: string) => void;
};

/**
 * Bande horizontale Journées & phases finales (maquette Détail Ligue, onglet
 * Résultats, DS 2026-09-21) : pilules verticales « J n », puis — après un
 * séparateur — les étapes à élimination directe « PF 1/4 », « PF 1/2 » et le
 * trophée de la finale. Sélection accent avec glow, point sous les groupes
 * joués, groupes à venir estompés mais sélectionnables (état « à venir »).
 */
export function RoundStrip({ items, selected, onSelect }: RoundStripProps) {
    const { t } = useTranslation(['leagues']);
    const textColor = useThemeColor('text');
    const onAccentColor = useThemeColor('on-accent');

    return (
        <ScrollView
            className="flex-none"
            contentContainerClassName="gap-2 px-0.5 pb-[7px] pt-0.5"
            horizontal
            // Barre fine visible (DS) : signale qu'il reste des phases à droite
            showsHorizontalScrollIndicator>
            {items.map((item, index) => {
                const active = item.key === selected;
                const stageKind = item.kind === 'round' ? null : item.kind;
                const isStage = stageKind !== null;
                const firstStage = isStage && items[index - 1]?.kind === 'round';
                const numeric = /^\d+$/.test(item.label);
                return (
                    <Fragment key={item.key}>
                        {firstStage ? (
                            <View className="my-2 w-px bg-border-strong opacity-70" />
                        ) : null}
                        <Pressable
                            accessibilityRole="button"
                            accessibilityState={{ selected: active }}
                            className={cn(
                                'min-h-[66px] w-[54px] items-center justify-center gap-[5px] rounded-pill border-[1.5px] border-transparent py-2',
                                active && 'bg-accent tc-glow-accent',
                                !active && item.emphasized && 'border-border-strong bg-surface',
                                !active && !item.played && 'opacity-50',
                            )}
                            onPress={() => onSelect(item.key)}>
                            {isStage || numeric ? (
                                <>
                                    <Text
                                        className={cn(
                                            'font-body-bold text-[10px] uppercase tracking-[0.8px]',
                                            active ? 'text-on-accent/80' : 'text-text-faint',
                                        )}>
                                        {isStage
                                            ? t('leagues:detail.results.stageShort')
                                            : t('leagues:detail.results.roundShort')}
                                    </Text>
                                    {item.kind === 'final' || item.kind === 'finals' ? (
                                        <Trophy
                                            color={active ? onAccentColor : textColor}
                                            size={22}
                                            strokeWidth={2}
                                        />
                                    ) : (
                                        <Text
                                            className={cn(
                                                'font-display',
                                                isStage
                                                    ? 'text-[19px] leading-[22px]'
                                                    : 'text-[22px] leading-[23px]',
                                                active ? 'text-on-accent' : 'text-text',
                                            )}>
                                            {stageKind
                                                ? t(
                                                      `leagues:detail.results.stages.${stageKind}.short`,
                                                  )
                                                : item.label}
                                        </Text>
                                    )}
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
                    </Fragment>
                );
            })}
        </ScrollView>
    );
}
