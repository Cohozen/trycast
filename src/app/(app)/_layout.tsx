import { Stack } from 'expo-router';

// Les onglets vivent dans (tabs) ; les écrans ligue sont poussés au-dessus
// (header natif visible, retour intégré).
export default function AppLayout() {
    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
        </Stack>
    );
}
