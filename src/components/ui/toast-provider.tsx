import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Toast, type ToastTone } from '@/components/ui/toast';
import { View } from '@/tw';

type ToastState = { id: number; message: string; tone: ToastTone };

type ToastContextValue = {
    /** Affiche un toast transitoire ; remplace celui en cours le cas échéant. */
    show: (message: string, tone?: ToastTone) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

/** Durée d'affichage avant disparition automatique. */
const TOAST_DURATION_MS = 2200;

/**
 * Host de toasts flottants monté une fois au niveau (app) : un seul toast à la
 * fois, épinglé en bas d'écran au-dessus du contenu, disparition automatique.
 * Le composant présentational `Toast` reste inchangé — ce host lui ajoute le
 * positionnement et le cycle de vie (que `Toast` déléguait à l'appelant).
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
    const insets = useSafeAreaInsets();
    const [toast, setToast] = useState<ToastState | null>(null);
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const counter = useRef(0);

    const show = useCallback((message: string, tone: ToastTone = 'neutral') => {
        if (timer.current) clearTimeout(timer.current);
        counter.current += 1;
        // La clé change à chaque appel → l'entrée est rejouée même toast affiché.
        setToast({ id: counter.current, message, tone });
        timer.current = setTimeout(() => setToast(null), TOAST_DURATION_MS);
    }, []);

    useEffect(
        () => () => {
            if (timer.current) clearTimeout(timer.current);
        },
        [],
    );

    const value = useMemo(() => ({ show }), [show]);

    return (
        <ToastContext.Provider value={value}>
            {children}
            <View
                className="absolute inset-x-0 items-center px-5"
                pointerEvents="box-none"
                style={{ bottom: Math.max(insets.bottom, 16) + 12 }}>
                {toast ? (
                    <Animated.View
                        entering={FadeInDown.duration(180)}
                        exiting={FadeOutDown.duration(160)}
                        key={toast.id}>
                        <Toast message={toast.message} tone={toast.tone} />
                    </Animated.View>
                ) : null}
            </View>
        </ToastContext.Provider>
    );
}

export function useToast() {
    const ctx = useContext(ToastContext);
    if (!ctx) {
        throw new Error('useToast doit être utilisé dans un <ToastProvider>');
    }
    return ctx;
}
