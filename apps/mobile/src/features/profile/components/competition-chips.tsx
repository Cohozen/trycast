import { useTranslation } from 'react-i18next';

import { Chip } from '@/components/ui/chip';
import { ScrollView, Text, View } from '@/tw';

type CompetitionOption = { id: string; name: string; is_active: boolean };

type CompetitionChipsProps = {
    competitions: CompetitionOption[];
    value: string;
    onChange: (id: string) => void;
};

/**
 * Sélecteur de compétition du Profil (DS 2026-09-21), au-dessus des chiffres
 * qu'il filtre : une rangée de puces qui déborde de la marge d'écran, point
 * grenat sur la compétition en cours. Une seule compétition : simple
 * contexte statique, pas de sélecteur.
 */
export function CompetitionChips({ competitions, value, onChange }: CompetitionChipsProps) {
    const { t } = useTranslation(['profile']);

    if (competitions.length === 1) {
        return (
            <View className="flex-row items-center gap-[7px]">
                <View className="h-1.5 w-1.5 rounded-pill bg-accent" />
                <Text className="font-body-bold text-[11px] uppercase tracking-[0.66px] text-text-muted">
                    {competitions[0].name}
                </Text>
            </View>
        );
    }

    return (
        <ScrollView
            className="-mx-5 flex-none"
            contentContainerClassName="gap-[7px] px-5 pb-0.5"
            horizontal
            showsHorizontalScrollIndicator={false}>
            {competitions.map((competition) => (
                <Chip
                    accessibilityLabel={
                        competition.is_active
                            ? `${competition.name}, ${t('profile:competition.current')}`
                            : undefined
                    }
                    dot={competition.is_active}
                    key={competition.id}
                    label={competition.name}
                    onPress={() => onChange(competition.id)}
                    selected={competition.id === value}
                />
            ))}
        </ScrollView>
    );
}
