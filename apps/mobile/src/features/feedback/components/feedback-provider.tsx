import { nativeApplicationVersion, nativeBuildVersion } from 'expo-application';
import { useGlobalSearchParams, usePathname, useSegments } from 'expo-router';
import * as Updates from 'expo-updates';
import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useColorScheme } from 'react-native';

import { useToast } from '@/components/ui/toast-provider';
import { useSession } from '@/features/auth/session-context';
import { useProfile } from '@/features/profile/use-profile';
import { trackEvent } from '@/lib/analytics';

import { buildFeedbackContext } from '../build-feedback-context';
import { isFeedbackAvailable, sendFeedback } from '../send-feedback';
import type { FeedbackScreen } from '../types';
import { FeedbackSheet } from './feedback-sheet';

type FeedbackContextValue = {
    /** Faux sans DSN Sentry : les déclencheurs ne s'affichent pas. */
    available: boolean;
    open: () => void;
};

const FeedbackContext = createContext<FeedbackContextValue | null>(null);

/**
 * Monté une fois dans le layout (app), comme le guide d'accueil : les
 * déclencheurs (en-tête des onglets, Réglages) partagent la même sheet.
 *
 * L'écran courant est **figé à l'ouverture** : c'est celui que regardait le
 * testeur quand il a voulu signaler, pas celui où il serait à l'envoi.
 */
export function FeedbackProvider({ children }: { children: ReactNode }) {
    const { t, i18n } = useTranslation(['feedback']);
    const toast = useToast();
    const pathname = usePathname();
    const segments = useSegments();
    const params = useGlobalSearchParams();
    const colorScheme = useColorScheme();
    const { session } = useSession();
    const profile = useProfile(session?.user.id);
    const [screen, setScreen] = useState<FeedbackScreen | null>(null);

    const open = useCallback(() => {
        setScreen({ pathname, segments: [...segments], params: { ...params } });
    }, [pathname, segments, params]);

    const close = useCallback(() => setScreen(null), []);

    const email = session?.user.email || null;

    const submit = useCallback(
        (message: string, attachEmail: boolean) => {
            if (!screen) return;
            const withEmail = attachEmail && email !== null;
            sendFeedback({
                message,
                context: buildFeedbackContext(screen, {
                    version: nativeApplicationVersion,
                    build: nativeBuildVersion,
                    channel: Updates.channel || null,
                    updateId: Updates.updateId ?? null,
                    locale: i18n.language,
                    theme: colorScheme === 'dark' ? 'dark' : 'light',
                }),
                contact: withEmail
                    ? { email, name: profile.data?.username ?? undefined }
                    : undefined,
            });
            trackEvent({ name: 'feedback_sent', props: { withEmail } });
            setScreen(null);
            toast.show(t('feedback:sent'), 'success');
        },
        [screen, email, profile.data?.username, i18n.language, colorScheme, toast, t],
    );

    const value = useMemo(() => ({ available: isFeedbackAvailable, open }), [open]);

    return (
        <FeedbackContext.Provider value={value}>
            {children}
            {isFeedbackAvailable ? (
                <FeedbackSheet
                    email={email}
                    onClose={close}
                    onSubmit={submit}
                    visible={screen !== null}
                />
            ) : null}
        </FeedbackContext.Provider>
    );
}

export function useFeedback() {
    const ctx = useContext(FeedbackContext);
    if (!ctx) {
        throw new Error('useFeedback doit être utilisé dans un <FeedbackProvider>');
    }
    return ctx;
}
