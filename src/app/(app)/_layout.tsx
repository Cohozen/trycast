import { Stack } from 'expo-router';

import { useStandingsRealtime } from '@/features/leagues/use-standings-realtime';
import { useActiveCompetition } from '@/features/matches/use-active-competition';

// Les onglets vivent dans (tabs) ; les écrans ligue sont poussés au-dessus
// (header natif visible, retour intégré).
export default function AppLayout() {
    const competition = useActiveCompetition();
    // Un seul channel Realtime pour toute l'app : les écrans classement
    // (général, ligues) n'ont qu'à lire le cache invalidé.
    useStandingsRealtime(competition.data?.id);

    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen
                name="league/create"
                options={{ headerShown: true, title: 'Créer une ligue' }}
            />
            <Stack.Screen
                name="league/join"
                options={{ headerShown: true, title: 'Rejoindre une ligue' }}
            />
            <Stack.Screen name="league/[id]" options={{ headerShown: true, title: 'Ligue' }} />
        </Stack>
    );
}
