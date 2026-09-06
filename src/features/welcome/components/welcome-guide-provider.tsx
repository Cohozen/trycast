import { useRootNavigationState, useRouter } from 'expo-router';
import {
    createContext,
    type ReactNode,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import { Linking } from 'react-native';

import { readPushPermission } from '@/features/notifications/read-permission';
import {
    ensurePushPermission,
    isPushSupportedHere,
    registerPushToken,
} from '@/features/notifications/register-push-token';
import { trackEvent } from '@/lib/analytics';

import { buildWelcomeSteps } from '../build-welcome-steps';
import type { WelcomeStep, WelcomeStepAction } from '../types';
import { loadWelcomeGuideSeen, markWelcomeGuideSeen } from '../welcome-guide-store';
import { WelcomeGuideSheet } from './welcome-guide-sheet';

type WelcomeGuideContextValue = {
    /** Rejoue le guide (rangée « Revoir le guide » des Réglages). */
    replay: () => void;
};

const WelcomeGuideContext = createContext<WelcomeGuideContextValue | null>(null);

/**
 * Monté une fois dans le layout (app) : ouvre le guide au premier lancement,
 * et l'expose au reste de l'app pour le rejouer. L'ouverture attend que la
 * navigation soit prête (même garde-fou que la célébration) pour ne pas
 * surgir pendant le splash animé.
 *
 * C'est aussi ici que part la demande de permission notifications du premier
 * lancement : `useRegisterPushToken` la suspend tant que le guide n'a pas été
 * vu, pour que le dialogue système n'arrive pas à froid par-dessus la sheet.
 */
export function WelcomeGuideProvider({ children }: { children: ReactNode }) {
    const router = useRouter();
    const navigationReady = !!useRootNavigationState()?.key;
    const [steps, setSteps] = useState<WelcomeStep[]>([]);
    const [visible, setVisible] = useState(false);
    // L'évaluation du premier lancement n'a lieu qu'une fois par montage.
    const evaluated = useRef(false);

    const resolveSteps = useCallback(async () => {
        setSteps(
            buildWelcomeSteps({
                permission: await readPushPermission(),
                pushSupported: isPushSupportedHere(),
            }),
        );
    }, []);

    useEffect(() => {
        if (!navigationReady || evaluated.current) return;
        evaluated.current = true;
        void (async () => {
            if (await loadWelcomeGuideSeen()) return;
            await resolveSteps();
            setVisible(true);
        })();
    }, [navigationReady, resolveSteps]);

    const close = useCallback((completed: boolean) => {
        setVisible(false);
        trackEvent({ name: 'welcome_guide_closed', props: { completed } });
        void (async () => {
            await markWelcomeGuideSeen();
            // Le flag posé, la demande spontanée de permission peut avoir lieu
            // — c'est le relais de `useRegisterPushToken` pour ce lancement.
            await registerPushToken();
        })();
    }, []);

    const replay = useCallback(() => {
        void (async () => {
            await resolveSteps();
            setVisible(true);
        })();
    }, [resolveSteps]);

    const onAction = useCallback(
        (action: WelcomeStepAction) => {
            switch (action) {
                case 'rules':
                    close(true);
                    router.push('/rules');
                    return;
                case 'leagues':
                    close(true);
                    router.push('/league/new');
                    return;
                case 'open-os-settings':
                    void Linking.openSettings();
                    return;
                case 'enable-notifications':
                    void (async () => {
                        const result = await ensurePushPermission({ force: true });
                        if (result?.granted) {
                            trackEvent({ name: 'notifications_enabled' });
                            void registerPushToken();
                        }
                        // La permission a bougé : le bouton du volet aussi.
                        await resolveSteps();
                    })();
            }
        },
        [close, resolveSteps, router],
    );

    const value = useMemo(() => ({ replay }), [replay]);

    return (
        <WelcomeGuideContext.Provider value={value}>
            {children}
            <WelcomeGuideSheet
                onAction={onAction}
                onClose={close}
                steps={steps}
                visible={visible}
            />
        </WelcomeGuideContext.Provider>
    );
}

export function useWelcomeGuide() {
    const ctx = useContext(WelcomeGuideContext);
    if (!ctx) {
        throw new Error('useWelcomeGuide doit être utilisé dans un <WelcomeGuideProvider>');
    }
    return ctx;
}
