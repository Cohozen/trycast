import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useStandingsRealtime } from '@/features/leagues/use-standings-realtime';
import { useActiveCompetition } from '@/features/matches/use-active-competition';

// Les onglets vivent dans (tabs) ; les écrans ligue sont poussés au-dessus
// (header natif visible, retour intégré).
export default function AppLayout() {
    const { t } = useTranslation(['leagues', 'matches']);
    const competition = useActiveCompetition();
    // Un seul channel Realtime pour toute l'app : les écrans classement
    // (général, ligues) n'ont qu'à lire le cache invalidé.
    useStandingsRealtime(competition.data?.id);

    return (
        <Stack screenOptions={{ headerShown: false }}>
            {/* title vide : le back natif des écrans poussés affiche juste le
                chevron, pas le nom technique « (tabs) » */}
            <Stack.Screen name="(tabs)" options={{ title: '' }} />
            <Stack.Screen name="settings" />
            <Stack.Screen
                name="league/create"
                options={{ headerShown: true, title: t('leagues:create.screenTitle') }}
            />
            <Stack.Screen
                name="league/join"
                options={{ headerShown: true, title: t('leagues:join.screenTitle') }}
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
    );
}
