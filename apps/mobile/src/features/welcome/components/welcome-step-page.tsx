import { BellRing, PencilLine, Users } from 'lucide-react-native';
import type { ComponentType } from 'react';
import { useTranslation } from 'react-i18next';

import { BrandMark } from '@/components/brand-mark';
import { Button } from '@/components/ui/button';
import { Text, useThemeColor, View } from '@/tw';

import type { WelcomeStep, WelcomeStepAction, WelcomeStepKey } from '../types';

type IconProps = { color: string; size: number; strokeWidth: number };

/**
 * Contenu de chaque volet. Les clés i18n sont écrites en toutes lettres (et
 * non construites) : c'est ce qui laisse tsc les vérifier contre les JSON.
 * `icon: null` = le volet d'accueil, qui porte le symbole de marque.
 */
const CONTENT = {
    intro: {
        icon: null,
        bodyKeys: ['welcome:steps.intro.body'],
    },
    predictions: {
        icon: PencilLine,
        bodyKeys: ['welcome:steps.predictions.body', 'welcome:steps.predictions.bonus'],
    },
    leagues: {
        icon: Users,
        bodyKeys: ['welcome:steps.leagues.body'],
    },
    notifications: {
        icon: BellRing,
        bodyKeys: ['welcome:steps.notifications.body'],
    },
} as const satisfies Record<
    WelcomeStepKey,
    { icon: ComponentType<IconProps> | null; bodyKeys: readonly string[] }
>;

type WelcomeStepPageProps = {
    step: WelcomeStep;
    /** Largeur d'une page : le défilement horizontal est paginé dessus. */
    width: number;
    onAction: (action: WelcomeStepAction) => void;
};

/**
 * Un volet du guide : symbole, titre, une ou deux phrases, et le bouton qui
 * envoie là où ça se passe. Hauteur minimale commune à tous les volets —
 * sinon la sheet grandit et rétrécit à chaque glissé.
 */
export function WelcomeStepPage({ step, width, onAction }: WelcomeStepPageProps) {
    const { t } = useTranslation(['welcome']);
    const brandColor = useThemeColor('brand');
    const content = CONTENT[step.key];
    const Icon = content.icon;
    // Déstructuré : garde le narrowing de `action` jusque dans le callback.
    const { action } = step;

    return (
        <View className="min-h-65 items-center justify-center gap-3.5 px-6" style={{ width }}>
            {Icon ? (
                <View className="h-14 w-14 items-center justify-center rounded-md bg-brand/10">
                    <Icon color={brandColor} size={26} strokeWidth={1.9} />
                </View>
            ) : (
                <BrandMark size={64} />
            )}

            {/* leading-[26px] : le ratio du token h2 rogne les ascendantes
                d'Anton en natif (même parade qu'à l'accueil) */}
            <Text className="text-center font-display text-h2 leading-[26px] text-text">
                {t(`welcome:steps.${step.key}.title`)}
            </Text>

            <View className="gap-2.5">
                {content.bodyKeys.map((key) => (
                    <Text
                        className="max-w-80 text-center font-body text-[14px] leading-5.25 text-text-muted"
                        key={key}>
                        {t(key)}
                    </Text>
                ))}
            </View>

            {action ? (
                <Button
                    onPress={() => onAction(action)}
                    size="sm"
                    title={t(`welcome:actions.${action}`)}
                    variant="secondary"
                />
            ) : null}
        </View>
    );
}
