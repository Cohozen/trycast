import * as WebBrowser from 'expo-web-browser';
import { ExternalLink, FileText, Info, ShieldCheck } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import { Card } from '@/components/ui/card';
import { legalUrl } from '@/lib/urls';
import { Pressable, Text, useThemeColor, View } from '@/tw';

/**
 * Rangées vers les pages légales du site vitrine (CGU, confidentialité,
 * mentions légales), ouvertes dans le navigateur intégré. Requis par l'App
 * Store et le Play Store : la politique de confidentialité doit être
 * atteignable depuis l'app, pas seulement depuis la fiche du store. Chaque page
 * s'ouvre dans la langue de l'app.
 */
export function LegalLinks() {
    const { t, i18n } = useTranslation(['common']);
    const brandColor = useThemeColor('brand');
    const textFaintColor = useThemeColor('text-faint');
    const language = i18n.resolvedLanguage;

    const rows: { key: string; icon: LucideIcon; label: string; url: string }[] = [
        {
            key: 'terms',
            icon: FileText,
            label: t('common:legal.terms'),
            url: legalUrl('terms', language),
        },
        {
            key: 'privacy',
            icon: ShieldCheck,
            label: t('common:legal.privacy'),
            url: legalUrl('privacy', language),
        },
        {
            key: 'notice',
            icon: Info,
            label: t('common:legal.notice'),
            url: legalUrl('legalNotice', language),
        },
    ];

    return (
        <Card className="overflow-hidden p-0">
            {rows.map(({ key, icon: Icon, label, url }, index) => (
                <Pressable
                    accessibilityRole="link"
                    key={key}
                    onPress={() => WebBrowser.openBrowserAsync(url)}>
                    <View
                        className={
                            index === 0
                                ? 'flex-row items-center gap-3 px-4 py-3.5'
                                : 'flex-row items-center gap-3 border-t border-border px-4 py-3.5'
                        }>
                        <View className="h-8 w-8 items-center justify-center rounded-sm bg-brand/10">
                            <Icon color={brandColor} size={17} strokeWidth={1.9} />
                        </View>
                        <Text className="flex-1 font-body-semibold text-[15px] text-text">
                            {label}
                        </Text>
                        <ExternalLink color={textFaintColor} size={16} strokeWidth={1.9} />
                    </View>
                </Pressable>
            ))}
        </Card>
    );
}
