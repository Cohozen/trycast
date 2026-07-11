import * as Notifications from 'expo-notifications';
import { ExternalLink, TriangleAlert } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppState, Linking, Platform } from 'react-native';

import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Pressable, Text, useThemeColor, View } from '@/tw';
import { deriveNotificationsUi, type PushPermission } from '../derive-notifications-ui';
import { ensurePushPermission, registerPushToken } from '../register-push-token';
import { DEFAULT_NOTIFICATION_PREFS } from '../types';
import {
    useNotificationPreferences,
    useUpdateNotificationPreferences,
} from '../use-notification-preferences';

async function readPermission(): Promise<PushPermission> {
    // Pas de push web : jamais de bannière, les préférences restent éditables
    if (Platform.OS === 'web') return 'granted';
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return 'granted';
    return current.canAskAgain ? 'undetermined' : 'denied';
}

/**
 * Section Notifications de l'écran Réglages (maquette TryCast Reglages) :
 * master switch avec sous-titre d'état, sous-toggles par type livré (rappel
 * de prono, résultats & points), bannière quand la permission OS est refusée.
 * Toggles optimistes (rollback silencieux si le serveur refuse).
 */
export function NotificationSettings({ userId }: { userId: string }) {
    const { t } = useTranslation(['profile']);
    const warningColor = useThemeColor('warning');
    const accentColor = useThemeColor('accent');

    const [permission, setPermission] = useState<PushPermission>('granted');
    const { data: prefs = DEFAULT_NOTIFICATION_PREFS } = useNotificationPreferences(userId);
    const updatePrefs = useUpdateNotificationPreferences(userId);

    const refreshPermission = useCallback(() => {
        readPermission().then(setPermission);
    }, []);

    // Lue au montage puis re-lue à chaque retour au premier plan : reflète un
    // aller-retour dans les réglages OS sans redémarrer l'app
    useEffect(() => {
        refreshPermission();
        const subscription = AppState.addEventListener('change', (state) => {
            if (state === 'active') refreshPermission();
        });
        return () => subscription.remove();
    }, [refreshPermission]);

    const ui = deriveNotificationsUi(permission, prefs);

    const onToggleMaster = async () => {
        const next = !prefs.master;
        // Réactiver le master alors que la permission n'a jamais été accordée :
        // re-tenter le dialogue système, et enregistrer le token si accordé
        if (next && permission !== 'granted') {
            const result = await ensurePushPermission({ force: true });
            refreshPermission();
            if (result?.granted) {
                void registerPushToken();
            }
        }
        updatePrefs.mutate({ ...prefs, master: next });
    };

    const typeRows = [
        {
            key: 'reminder',
            label: t('profile:settings.notifications.reminder.label'),
            description: t('profile:settings.notifications.reminder.description'),
            checked: prefs.reminderEnabled,
            onToggle: () =>
                updatePrefs.mutate({ ...prefs, reminderEnabled: !prefs.reminderEnabled }),
        },
        {
            key: 'results',
            label: t('profile:settings.notifications.results.label'),
            description: t('profile:settings.notifications.results.description'),
            checked: prefs.resultsEnabled,
            onToggle: () => updatePrefs.mutate({ ...prefs, resultsEnabled: !prefs.resultsEnabled }),
        },
    ];

    return (
        <Card className="overflow-hidden p-0">
            {/* Master */}
            <View className="flex-row items-center gap-3 px-[15px] py-[13px]">
                <View className="min-w-0 flex-1 gap-0.5">
                    <Text
                        className={
                            ui.masterDisabled
                                ? 'font-body-semibold text-[15px] text-text-faint'
                                : 'font-body-semibold text-[15px] text-text'
                        }>
                        {t('profile:settings.notifications.master.label')}
                    </Text>
                    <Text className="font-body text-[12px] leading-[16px] text-text-muted">
                        {t(ui.subtitleKey)}
                    </Text>
                </View>
                <Switch
                    accessibilityLabel={t('profile:settings.notifications.master.label')}
                    checked={ui.masterOn}
                    disabled={ui.masterDisabled}
                    onToggle={onToggleMaster}
                />
            </View>

            {/* Permission OS refusée */}
            {ui.showBanner ? (
                <View className="mx-[15px] mb-[13px] flex-row items-start gap-2.5 rounded-sm border border-warning/35 bg-warning/15 px-3 py-[11px]">
                    <TriangleAlert color={warningColor} size={17} strokeWidth={2} />
                    <View className="min-w-0 flex-1 gap-1.5">
                        <Text className="font-body text-[12.5px] leading-[17px] text-text">
                            {t('profile:settings.notifications.blockedBanner', {
                                os: Platform.OS === 'ios' ? 'iOS' : 'Android',
                            })}
                        </Text>
                        <Pressable
                            accessibilityRole="button"
                            className="flex-row items-center gap-1 self-start"
                            onPress={() => Linking.openSettings()}>
                            <Text className="font-body-bold text-[12.5px] text-accent">
                                {t('profile:settings.notifications.openSettings')}
                            </Text>
                            <ExternalLink color={accentColor} size={13} strokeWidth={2.4} />
                        </Pressable>
                    </View>
                </View>
            ) : null}

            {/* Types livrés — « Activité de ligue » et « Invitations » arriveront
                avec leur backend */}
            {ui.showToggles ? (
                <View className="border-t border-border">
                    {typeRows.map((row, index) => (
                        <View
                            className={
                                index === 0
                                    ? 'flex-row items-center gap-3 px-[15px] py-3'
                                    : 'flex-row items-center gap-3 border-t border-border px-[15px] py-3'
                            }
                            key={row.key}>
                            <View className="min-w-0 flex-1 gap-0.5">
                                <Text className="font-body-medium text-[14px] text-text">
                                    {row.label}
                                </Text>
                                <Text className="font-body text-[11.5px] leading-[15px] text-text-faint">
                                    {row.description}
                                </Text>
                            </View>
                            <Switch
                                accessibilityLabel={row.label}
                                checked={row.checked}
                                onToggle={row.onToggle}
                            />
                        </View>
                    ))}
                </View>
            ) : null}
        </Card>
    );
}
