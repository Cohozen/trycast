import type { ReactNode } from 'react';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Text, View } from '@/tw';

type RuleCardProps = {
    /** Icône lucide déjà colorée (les icônes ne lisent pas className). */
    icon: ReactNode;
    title: string;
    /** Étiquette de points affichée à droite du titre (ex. « +50 pts »). */
    value?: string;
    description: string;
    /** Précision secondaire, plus discrète, sous la description. */
    note?: string;
};

/** Carte du référentiel des règles : un volet du barème ou une règle générale. */
export function RuleCard({ icon, title, value, description, note }: RuleCardProps) {
    return (
        <Card className="gap-2.5 px-4 py-3.5">
            <View className="flex-row items-center gap-3">
                <View className="h-8 w-8 items-center justify-center rounded-sm bg-brand/10">
                    {icon}
                </View>
                <Text className="flex-1 font-body-bold text-[15px] text-text">{title}</Text>
                {value ? <Badge tone="brand">{value}</Badge> : null}
            </View>
            <Text className="font-body text-[12.5px] leading-[18px] text-text-muted">
                {description}
            </Text>
            {note ? (
                <Text className="font-body text-[12px] leading-[17px] text-text-faint">{note}</Text>
            ) : null}
        </Card>
    );
}
