import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { PushPermission } from './derive-notifications-ui';

/**
 * État simplifié de la permission OS. Partagé par la section Notifications des
 * Réglages et le guide d'accueil : les deux doivent lire la permission de la
 * même façon, notamment le repli `canAskAgain` qui distingue « pas encore
 * demandé » d'un refus définitif.
 */
export async function readPushPermission(): Promise<PushPermission> {
    // Pas de push web : jamais de bannière, les préférences restent éditables
    if (Platform.OS === 'web') return 'granted';
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return 'granted';
    return current.canAskAgain ? 'undetermined' : 'denied';
}
