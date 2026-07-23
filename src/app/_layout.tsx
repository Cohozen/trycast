import '@/features/notifications/notification-handler';
import '@/global.css';
import '@/lib/i18n';

import { Anton_400Regular } from '@expo-google-fonts/anton';
import {
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
} from '@expo-google-fonts/inter';
import * as Sentry from '@sentry/react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-splash-overlay';
import { SessionProvider, useSession } from '@/features/auth/session-context';
import { useNotificationObserver } from '@/features/notifications/use-notification-observer';
import { useRegisterPushToken } from '@/features/notifications/use-register-push-token';
import { applyStoredLanguagePreference } from '@/features/profile/language-preference';
import { applyStoredThemePreference } from '@/features/profile/theme-preference';
import { useProfile } from '@/features/profile/use-profile';
import { useSyncLocale } from '@/features/profile/use-sync-locale';
import { hydrateTelemetryPreferences } from '@/features/privacy/telemetry-preference';
import { initAnalytics } from '@/lib/analytics';
import { initDiagnostics } from '@/lib/diagnostics';
import { queryClient } from '@/lib/query';
import { navigationThemes } from '@/tw/navigation-theme';

SplashScreen.preventAutoHideAsync();

// Au scope module, avant tout rendu : c'est ce qui permet de capturer un
// plantage de démarrage. La préférence de l'utilisateur est relue juste après
// et appliquée par le beforeSend, pas par une ré-initialisation.
initDiagnostics();

function RootNavigator() {
    const { session, isLoading } = useSession();
    useSyncLocale(session?.user.id);
    useRegisterPushToken(session?.user.id);
    useNotificationObserver();
    const profile = useProfile(session?.user.id);
    const [fontsLoaded] = useFonts({
        Anton_400Regular,
        Inter_400Regular,
        Inter_500Medium,
        Inter_600SemiBold,
        Inter_700Bold,
    });

    // Le splash overlay reste affiché tant que la session n'est pas restaurée
    // et que les polices du design system ne sont pas prêtes. Le profil s'y
    // ajoute : sans lui, un compte à qui il manque un pseudo verrait l'accueil
    // clignoter avant d'être renvoyé sur l'onboarding. `isLoading` (et non
    // `isPending`) est délibéré : il retombe à faux sans session comme en cas
    // d'échec réseau — un profil illisible ne doit pas bloquer sur le splash.
    if (isLoading || !fontsLoaded || profile.isLoading) {
        return null;
    }

    // Un pseudo « subi » (repli du trigger pour un compte OAuth) n'entre pas
    // dans l'app : il serait affiché aux autres dans les ligues et classements.
    const needsUsername = profile.data ? !profile.data.username_chosen : false;

    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Protected guard={!!session && !needsUsername}>
                <Stack.Screen name="(app)" />
            </Stack.Protected>
            <Stack.Protected guard={!!session && needsUsername}>
                <Stack.Screen name="(onboarding)" />
            </Stack.Protected>
            <Stack.Protected guard={!session}>
                <Stack.Screen name="(auth)" />
            </Stack.Protected>
        </Stack>
    );
}

function RootLayout() {
    const colorScheme = useColorScheme();

    // Ré-applique thème et langue choisis dans Réglages (effet : AsyncStorage
    // n'existe pas pendant le rendu SSR web, et Appearance n'est utile qu'au client)
    useEffect(() => {
        applyStoredThemePreference();
        applyStoredLanguagePreference();
        // Les préférences de télémétrie d'abord : la mesure d'usage ne démarre
        // qu'une fois qu'on sait que l'utilisateur ne l'a pas coupée.
        hydrateTelemetryPreferences().then(initAnalytics);
    }, []);

    return (
        <QueryClientProvider client={queryClient}>
            <SessionProvider>
                <ThemeProvider
                    value={colorScheme === 'dark' ? navigationThemes.dark : navigationThemes.light}>
                    <AnimatedSplashOverlay />
                    <RootNavigator />
                    <StatusBar style="auto" animated />
                </ThemeProvider>
            </SessionProvider>
        </QueryClientProvider>
    );
}

// Sentry.wrap installe la capture des erreurs de rendu React au-dessus de tout
// l'arbre. Sans DSN configuré, l'enveloppe est neutre.
export default Sentry.wrap(RootLayout);
