import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { ToastProvider } from '@/components/ui/toast-provider';
import { CelebrationHost } from '@/features/celebration/components/celebration-host';
import { useStandingsRealtime } from '@/features/leagues/use-standings-realtime';
import { useActiveCompetition } from '@/features/matches/use-active-competition';
import { useThemeColor } from '@/tw';

// Les onglets vivent dans (tabs) ; les autres écrans sont poussés au-dessus.
// Les pages de détail (match, ligue, profil public) n'ont pas de header natif :
// elles portent leur propre en-tête avec le bouton retour.
export default function AppLayout() {
    const { t } = useTranslation(['leagues', 'profile', 'scoring']);
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
                    name="rules"
                    options={{ headerShown: true, title: t('scoring:rules.screenTitle') }}
                />
                <Stack.Screen
                    name="league/new"
                    options={{ headerShown: true, title: t('leagues:new.screenTitle') }}
                />
                {/* Pages détail : pas de header natif — elles portent leur
                    propre en-tête repliable (CollapsingHeader), avec le bouton
                    retour toujours accessible dans la barre compacte. */}
                <Stack.Screen name="league/[id]" options={{ headerShown: false }} />
                <Stack.Screen name="match/[id]" options={{ headerShown: false }} />
                {/* Profil public : bouton retour inline dans le bloc épinglé */}
                <Stack.Screen name="player/[id]" options={{ headerShown: false }} />
            </Stack>
            <CelebrationHost />
        </ToastProvider>
    );
}
