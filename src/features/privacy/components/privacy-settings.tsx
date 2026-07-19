import { Download } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator } from 'react-native';

import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Toast } from '@/components/ui/toast';
import { toAuthMessageKey } from '@/features/auth/errors';
import { i18n } from '@/lib/i18n';
import { Pressable, Text, useThemeColor, View } from '@/tw';
import { useCommunicationsConsent, useSetCommunicationsConsent } from '../use-consent';
import { useExportData } from '../use-export-data';

/**
 * Section Confidentialité de l'écran Réglages (RGPD) : consentement aux
 * communications (historisé, date de recueil affichée) et export des données
 * personnelles via la feuille de partage native. Toggle optimiste, erreur
 * d'export remontée en toast.
 */
export function PrivacySettings({ userId }: { userId: string }) {
    const { t } = useTranslation(['profile', 'auth', 'common']);
    const brandColor = useThemeColor('brand');
    const accentColor = useThemeColor('accent');

    const { data: consent } = useCommunicationsConsent(userId);
    const setConsent = useSetCommunicationsConsent(userId);
    const exportData = useExportData();

    const [exportError, setExportError] = useState<string | null>(null);

    const granted = consent?.granted ?? false;
    const recordedAt =
        consent && granted
            ? new Intl.DateTimeFormat(i18n.language, { dateStyle: 'long' }).format(
                  new Date(consent.created_at),
              )
            : null;

    const onToggleConsent = () => {
        setConsent.mutate(!granted);
    };

    const onExport = async () => {
        setExportError(null);
        try {
            await exportData.mutateAsync();
        } catch (err) {
            setExportError(t(toAuthMessageKey(err)));
        }
    };

    return (
        <View className="gap-2.5">
            {exportError ? <Toast message={exportError} tone="accent" /> : null}

            <Card className="overflow-hidden p-0">
                {/* Consentement communications */}
                <View className="flex-row items-center gap-3 px-[15px] py-[13px]">
                    <View className="min-w-0 flex-1 gap-0.5">
                        <Text className="font-body-semibold text-[15px] text-text">
                            {t('profile:settings.privacy.communications.label')}
                        </Text>
                        <Text className="font-body text-[12px] leading-[16px] text-text-muted">
                            {recordedAt
                                ? t('profile:settings.privacy.communications.since', {
                                      date: recordedAt,
                                  })
                                : t('profile:settings.privacy.communications.description')}
                        </Text>
                    </View>
                    <Switch
                        accessibilityLabel={t('profile:settings.privacy.communications.label')}
                        checked={granted}
                        onToggle={onToggleConsent}
                    />
                </View>

                {/* Export des données */}
                <Pressable
                    accessibilityRole="button"
                    disabled={exportData.isPending}
                    onPress={onExport}>
                    <View className="flex-row items-center gap-3 border-t border-border px-[15px] py-3">
                        <View className="h-8 w-8 items-center justify-center rounded-sm bg-brand/10">
                            <Download color={brandColor} size={17} strokeWidth={1.9} />
                        </View>
                        <View className="min-w-0 flex-1 gap-0.5">
                            <Text className="font-body-semibold text-[15px] text-text">
                                {t('profile:settings.privacy.export.label')}
                            </Text>
                            <Text className="font-body text-[11.5px] leading-[15px] text-text-faint">
                                {t('profile:settings.privacy.export.description')}
                            </Text>
                        </View>
                        {exportData.isPending ? (
                            <ActivityIndicator color={accentColor} size="small" />
                        ) : null}
                    </View>
                </Pressable>
            </Card>
        </View>
    );
}
