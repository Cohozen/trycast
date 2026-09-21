import { useRouter } from 'expo-router';
import { LogIn, Plus } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Pressable, Text, useThemeColor, View } from '@/tw';
import { cn } from '@/tw/variants';

/**
 * Créer / Rejoindre une ligue en une carte à deux actions (maquette Mes
 * Matchs, DS du 2026-09-21) : pastille grenat pour créer, verte pour
 * rejoindre, filet vertical entre les deux. Libellé court « Rejoindre » :
 * les deux actions tiennent côte à côte sur une demi-largeur.
 */
export function LeagueActionsCard() {
    const { t } = useTranslation(['leagues']);
    const router = useRouter();
    const accentColor = useThemeColor('accent');
    const brandColor = useThemeColor('brand');
    // Voile grenat au press (motif des primitives : état local, pas `active:`)
    const [pressed, setPressed] = useState<'create' | 'join' | null>(null);
    const release = () => setPressed(null);

    return (
        <View className="flex-row overflow-hidden rounded-md border border-border bg-surface tc-shadow-sm">
            <Pressable
                accessibilityRole="button"
                className={cn(
                    'min-h-[52px] flex-1 flex-row items-center gap-2.5 px-3.5 py-3',
                    pressed === 'create' && 'bg-accent/7',
                )}
                onPress={() => router.push('/league/new')}
                onPressIn={() => setPressed('create')}
                onPressOut={release}>
                <View className="h-7 w-7 items-center justify-center rounded-sm bg-accent/12">
                    <Plus color={accentColor} size={16} strokeWidth={2.2} />
                </View>
                <Text className="shrink font-body-bold text-[14px] text-text" numberOfLines={1}>
                    {t('leagues:actions.create')}
                </Text>
            </Pressable>
            <View className="w-px bg-border" />
            <Pressable
                accessibilityLabel={t('leagues:actions.join')}
                accessibilityRole="button"
                className={cn(
                    'min-h-[52px] flex-1 flex-row items-center gap-2.5 px-3.5 py-3',
                    pressed === 'join' && 'bg-accent/7',
                )}
                onPress={() => router.push({ pathname: '/league/new', params: { tab: 'join' } })}
                onPressIn={() => setPressed('join')}
                onPressOut={release}>
                <View className="h-7 w-7 items-center justify-center rounded-sm bg-brand/12">
                    <LogIn color={brandColor} size={16} strokeWidth={2.2} />
                </View>
                <Text className="shrink font-body-bold text-[14px] text-text" numberOfLines={1}>
                    {t('leagues:actions.joinShort')}
                </Text>
            </Pressable>
        </View>
    );
}
