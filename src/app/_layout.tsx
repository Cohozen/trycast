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
import { QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { SessionProvider, useSession } from '@/features/auth/session-context';
import { useNotificationObserver } from '@/features/notifications/use-notification-observer';
import { useRegisterPushToken } from '@/features/notifications/use-register-push-token';
import { applyStoredThemePreference } from '@/features/profile/theme-preference';
import { useSyncLocale } from '@/features/profile/use-sync-locale';
import { queryClient } from '@/lib/query';

SplashScreen.preventAutoHideAsync();

function RootNavigator() {
    const { session, isLoading } = useSession();
    useSyncLocale(session?.user.id);
    useRegisterPushToken(session?.user.id);
    useNotificationObserver();
    const [fontsLoaded] = useFonts({
        Anton_400Regular,
        Inter_400Regular,
        Inter_500Medium,
        Inter_600SemiBold,
        Inter_700Bold,
    });

    // Le splash overlay reste affiché tant que la session n'est pas restaurée
    // et que les polices du design system ne sont pas prêtes
    if (isLoading || !fontsLoaded) {
        return null;
    }

    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Protected guard={!!session}>
                <Stack.Screen name="(app)" />
            </Stack.Protected>
            <Stack.Protected guard={!session}>
                <Stack.Screen name="(auth)" />
            </Stack.Protected>
        </Stack>
    );
}

export default function RootLayout() {
    const colorScheme = useColorScheme();

    // Ré-applique le thème choisi dans Réglages (effet : AsyncStorage n'existe
    // pas pendant le rendu SSR web, et Appearance n'est utile qu'au client)
    useEffect(() => {
        applyStoredThemePreference();
    }, []);

    return (
        <QueryClientProvider client={queryClient}>
            <SessionProvider>
                <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
                    <AnimatedSplashOverlay />
                    <RootNavigator />
                    <StatusBar style="auto" animated />
                </ThemeProvider>
            </SessionProvider>
        </QueryClientProvider>
    );
}
