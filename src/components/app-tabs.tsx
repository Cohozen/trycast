import {
    TabList,
    TabListProps,
    Tabs,
    TabSlot,
    TabTrigger,
    TabTriggerSlotProps,
} from 'expo-router/ui';
import { BarChart3, CheckCircle, List, User } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Pressable, Text, useThemeColor, View } from '@/tw';
import { cn } from '@/tw/variants';

/**
 * Barre d'onglets flottante du design system (4 onglets). L'onglet actif
 * porte l'étincelle grenat sur une pastille claire — retintée en tons verts
 * en dark (le blanc du DS ne va pas sur la surface verte, cf. note du
 * livrable). Pas de flou : surface quasi opaque, plus robuste en RN.
 */
export default function AppTabs() {
    const { t } = useTranslation('common');

    return (
        <Tabs>
            <TabSlot style={{ height: '100%' }} />
            <TabList asChild>
                <FloatingTabList>
                    <TabTrigger asChild href="/" name="index">
                        <TabButton icon={List} label={t('tabs.matches')} />
                    </TabTrigger>
                    <TabTrigger asChild href="/results" name="results">
                        <TabButton icon={CheckCircle} label={t('tabs.results')} />
                    </TabTrigger>
                    <TabTrigger asChild href="/leaderboard" name="leaderboard">
                        <TabButton icon={BarChart3} label={t('tabs.leaderboard')} />
                    </TabTrigger>
                    <TabTrigger asChild href="/profile" name="profile">
                        <TabButton icon={User} label={t('tabs.profile')} />
                    </TabTrigger>
                </FloatingTabList>
            </TabList>
        </Tabs>
    );
}

function FloatingTabList(props: TabListProps) {
    // Marge basse dynamique : au-dessus de l'indicateur home / barre gestuelle,
    // plancher 16px sur les appareils sans inset (valeur runtime → prop style).
    const insets = useSafeAreaInsets();
    return (
        <View
            className="absolute inset-x-0 bottom-0 items-center px-4"
            style={{ paddingBottom: Math.max(insets.bottom, 16) }}>
            <View className="w-full max-w-[500px] flex-row gap-1 rounded-[34px] border border-white/70 bg-surface/95 p-2 tc-shadow-lg dark:border-green-600/60">
                {props.children}
            </View>
        </View>
    );
}

type TabButtonProps = TabTriggerSlotProps & { icon: LucideIcon; label: string };

export function TabButton({ icon: Icon, label, isFocused, ...props }: TabButtonProps) {
    const accent = useThemeColor('accent');
    const faint = useThemeColor('text-faint');

    return (
        <Pressable {...props} className="flex-1">
            <View
                className={cn(
                    'flex-1 items-center justify-center gap-1.5 rounded-[28px] border border-transparent px-2 py-3',
                    isFocused &&
                        'border-white/50 bg-white/55 tc-shadow-sm dark:border-green-600/70 dark:bg-green-700/70',
                )}>
                <Icon
                    color={isFocused ? accent : faint}
                    size={24}
                    strokeWidth={isFocused ? 2.4 : 1.9}
                />
                <Text
                    className={cn(
                        'font-body-bold text-[10px] tracking-[0.3px]',
                        isFocused ? 'text-accent' : 'text-text-faint',
                    )}>
                    {label}
                </Text>
            </View>
        </Pressable>
    );
}
