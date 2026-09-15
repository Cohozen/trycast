import { Stack } from 'expo-router';

// Le fond des transitions vient du thème navigation (tokens DS), plus
// besoin de le forcer ici — un blanc en dur flashait en dark.
export default function AuthLayout() {
    return <Stack screenOptions={{ headerShown: false }} />;
}
