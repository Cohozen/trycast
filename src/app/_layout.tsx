import '@/global.css';

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
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { SessionProvider, useSession } from '@/features/auth/session-context';
import { queryClient } from '@/lib/query';

SplashScreen.preventAutoHideAsync();

function RootNavigator() {
    const { session, isLoading } = useSession();
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
    return (
        <QueryClientProvider client={queryClient}>
            <SessionProvider>
                <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
                    <AnimatedSplashOverlay />
                    <RootNavigator />
                </ThemeProvider>
            </SessionProvider>
        </QueryClientProvider>
    );
}
