import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Module à effet de bord (importé par le layout racine, comme @/lib/i18n) :
// comportement des notifications quand l'app est au premier plan — bannière
// discrète, pas de son ni de badge (l'utilisateur est déjà dans l'app).
if (Platform.OS !== 'web') {
    Notifications.setNotificationHandler({
        handleNotification: async () => ({
            shouldShowBanner: true,
            shouldShowList: true,
            shouldPlaySound: false,
            shouldSetBadge: false,
        }),
    });
}
