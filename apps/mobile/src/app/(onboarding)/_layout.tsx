import { Stack } from 'expo-router';

// Même réglage que le stack (auth) : pas d'en-tête, le fond vient du thème
// navigation construit sur les tokens du DS.
export default function OnboardingLayout() {
    return <Stack screenOptions={{ headerShown: false }} />;
}
