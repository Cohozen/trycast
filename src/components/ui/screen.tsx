import type { ComponentProps } from 'react';
import { Platform } from 'react-native';

import { ScrollView } from '@/tw';
import { useScreenInsets } from '@/tw/use-screen-insets';
import { cn } from '@/tw/variants';

type ScreenProps = ComponentProps<typeof ScrollView> & {
    /** Classes du conteneur de contenu (padding, gap…) */
    contentClassName?: string;
    /**
     * Padding haut : 'safe' (défaut) cale le contenu sous la barre d'état ;
     * 'header' ne met rien, le header natif occupe déjà la zone.
     */
    top?: 'safe' | 'header';
    /**
     * Padding bas : 'content' (défaut) = fin de scroll classique ;
     * 'tabBar' = dégagement pour la tab bar flottante des onglets.
     */
    bottom?: 'content' | 'tabBar';
};

/**
 * Conteneur d'écran du design system : fond thème, scroll, contenu centré
 * à 800px max (confort web/tablette), marges calées sur les zones système
 * (`top`/`bottom`) et gestion clavier intégrée — le scroll suit le clavier
 * (iOS), les taps restent actifs clavier ouvert, glisser pour le fermer.
 * Les écrans à bloc épinglé (profil, classement…) gardent leur layout
 * dédié avec `useScreenInsets()`.
 */
export function Screen({
    children,
    className,
    contentClassName,
    contentContainerStyle,
    top = 'safe',
    bottom = 'content',
    ...props
}: ScreenProps) {
    const screenInsets = useScreenInsets();
    return (
        <ScrollView
            automaticallyAdjustKeyboardInsets
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
            keyboardShouldPersistTaps="handled"
            {...props}
            className={cn('flex-1 bg-bg', className)}
            contentContainerClassName={cn(
                'w-full max-w-[800px] self-center px-5 pb-10 gap-4',
                contentClassName,
            )}
            contentContainerStyle={[
                top === 'safe' && { paddingTop: screenInsets.top },
                bottom === 'tabBar' && { paddingBottom: screenInsets.bottomTabBar },
                contentContainerStyle,
            ]}>
            {children}
        </ScrollView>
    );
}
