import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { ToastProvider } from '@/components/ui/toast-provider';
import { useStandingsRealtime } from '@/features/leagues/use-standings-realtime';
import { useActiveCompetition } from '@/features/matches/use-active-competition';
import { useThemeColor } from '@/tw';

// Les onglets vivent dans (tabs) ; les écrans ligue sont poussés au-dessus
// (header natif visible, retour intégré).
export default function AppLayout() {
    const { t } = useTranslation(['leagues', 'matches', 'profile']);
    const competition = useActiveCompetition();
    const bgColor = useThemeColor('bg');
    const textColor = useThemeColor('text');
    // Un seul channel Realtime pour toute l'app : les écrans classement
    // (général, ligues) n'ont qu'à lire le cache invalidé.
    useStandingsRealtime(competition.data?.id);

    return (
        <ToastProvider>
            <Stack
                screenOptions={{
                    headerShown: false,
                    // Header natif aux couleurs du DS : fond identique à l'écran
                    // (sans hairline → continuité visuelle), titre Inter SemiBold.
                    // Le chevron reste couleur texte : le grenat est réservé aux
                    // CTA/live/sélection, pas à la navigation.
                    headerStyle: { backgroundColor: bgColor },
                    headerShadowVisible: false,
                    headerTintColor: textColor,
                    headerTitleStyle: { fontFamily: 'Inter_600SemiBold', color: textColor },
                }}>
                {/* title vide : le back natif des écrans poussés affiche juste le
                    chevron, pas le nom technique « (tabs) » */}
                <Stack.Screen name="(tabs)" options={{ title: '' }} />
                <Stack.Screen
                    name="settings"
                    options={{ headerShown: true, title: t('profile:settings.title') }}
                />
                <Stack.Screen
                    name="league/new"
                    options={{ headerShown: true, title: t('leagues:new.screenTitle') }}
                />
                <Stack.Screen
                    name="league/[id]"
                    options={{ headerShown: true, title: t('leagues:detail.screenTitle') }}
                />
                <Stack.Screen
                    name="match/[id]"
                    options={{ headerShown: true, title: t('matches:detail.screenTitle') }}
                />
            </Stack>
        </ToastProvider>
    );
}
