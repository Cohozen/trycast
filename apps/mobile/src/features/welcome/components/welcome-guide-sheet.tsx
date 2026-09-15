import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    type NativeScrollEvent,
    type NativeSyntheticEvent,
    ScrollView,
    useWindowDimensions,
} from 'react-native';

import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { View } from '@/tw';
import { cn } from '@/tw/variants';

import type { WelcomeStep, WelcomeStepAction } from '../types';
import { WelcomeStepPage } from './welcome-step-page';

type WelcomeGuideSheetProps = {
    visible: boolean;
    steps: WelcomeStep[];
    onAction: (action: WelcomeStepAction) => void;
    /** `completed` : le guide a été suivi jusqu'au bout (vs. passé ou glissé). */
    onClose: (completed: boolean) => void;
};

/**
 * Guide d'accueil : les volets défilent horizontalement (glissé ou bouton),
 * la sheet se ferme par « C'est parti », « Passer » ou le glissé vers le bas
 * de la primitive. Rien n'est bloquant — on peut en sortir à tout moment.
 */
export function WelcomeGuideSheet({ visible, steps, onAction, onClose }: WelcomeGuideSheetProps) {
    const { t } = useTranslation(['welcome']);
    const { width } = useWindowDimensions();
    const scroller = useRef<ScrollView>(null);
    const [index, setIndex] = useState(0);

    // Chaque ouverture repart du premier volet, y compris quand on rejoue le
    // guide depuis les Réglages. Ajusté en phase de rendu (motif React
    // « ajuster un état sur changement de prop »), et le compteur d'ouvertures
    // sert de clé au ScrollView : le remonter est la façon la plus sûre de le
    // ramener à l'offset zéro sans effet de bord dans un effet.
    const [wasVisible, setWasVisible] = useState(visible);
    const [openCount, setOpenCount] = useState(0);
    if (visible !== wasVisible) {
        setWasVisible(visible);
        if (visible) {
            setIndex(0);
            setOpenCount(openCount + 1);
        }
    }

    const last = steps.length - 1;
    const isLast = index >= last;

    const onMomentumEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        setIndex(Math.round(event.nativeEvent.contentOffset.x / width));
    };

    const goNext = () => {
        if (isLast) {
            onClose(true);
            return;
        }
        const next = index + 1;
        setIndex(next);
        scroller.current?.scrollTo({ x: width * next, animated: true });
    };

    return (
        <BottomSheet
            backdropOpacity={0.5}
            bottomInset={24}
            contentClassName="gap-4"
            onClose={() => onClose(false)}
            visible={visible}>
            <ScrollView
                horizontal
                key={openCount}
                onMomentumScrollEnd={onMomentumEnd}
                pagingEnabled
                ref={scroller}
                showsHorizontalScrollIndicator={false}>
                {steps.map((step) => (
                    <WelcomeStepPage key={step.key} onAction={onAction} step={step} width={width} />
                ))}
            </ScrollView>

            {/* Les puces ne sont pas focalisables une à une : l'ensemble
                s'annonce comme « Étape 2 sur 4 ». */}
            <View
                accessible
                accessibilityLabel={t('welcome:nav.progress', {
                    current: index + 1,
                    total: steps.length,
                })}
                className="flex-row justify-center gap-1.5">
                {steps.map((step, position) => (
                    <View
                        className={cn(
                            'h-1.5 rounded-pill',
                            position === index ? 'w-4 bg-accent' : 'w-1.5 bg-border-strong',
                        )}
                        key={step.key}
                    />
                ))}
            </View>

            <View className="gap-2 px-5">
                <Button
                    fullWidth
                    onPress={goNext}
                    title={isLast ? t('welcome:nav.done') : t('welcome:nav.next')}
                />
                {/* Rendu même au dernier volet, en transparent : le retirer
                    ferait remonter le haut de la sheet d'un cran. */}
                <View
                    accessibilityElementsHidden={isLast}
                    className={cn(isLast && 'opacity-0')}
                    importantForAccessibility={isLast ? 'no-hide-descendants' : 'auto'}
                    pointerEvents={isLast ? 'none' : 'auto'}>
                    <Button
                        fullWidth
                        onPress={() => onClose(false)}
                        title={t('welcome:nav.skip')}
                        variant="ghost"
                    />
                </View>
            </View>
        </BottomSheet>
    );
}
