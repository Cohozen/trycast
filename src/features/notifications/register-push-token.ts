import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { i18n } from '@/lib/i18n';
import { supabase } from '@/lib/supabase';
import { isPushSupported } from './push-support';

/** La permission ne se demande qu'une fois spontanément (au premier lancement
 * connecté). Après un refus, seul l'écran Réglages permet de re-tenter. */
const PERMISSION_ASKED_KEY = 'notifications.permission-asked';

function pushSupported(): boolean {
    return isPushSupported({
        isDevice: Device.isDevice,
        executionEnvironment: Constants.executionEnvironment ?? 'bare',
        platform: Platform.OS,
    });
}

/**
 * Channel Android par défaut : obligatoire dès Android 8 pour afficher quoi
 * que ce soit, et à créer AVANT la demande de permission (Android 13 ne
 * montre le dialogue qu'aux apps ayant au moins un channel).
 */
async function ensureAndroidChannel(): Promise<void> {
    if (Platform.OS !== 'android') return;
    await Notifications.setNotificationChannelAsync('default', {
        name: i18n.t('profile:settings.notifications.channelName'),
        importance: Notifications.AndroidImportance.MAX,
    });
}

/** Demande la permission si elle n'a jamais été demandée. Retourne l'état final. */
export async function ensurePushPermission(options?: {
    force?: boolean;
}): Promise<Notifications.NotificationPermissionsStatus | null> {
    if (!pushSupported()) return null;
    await ensureAndroidChannel();
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return current;
    if (!current.canAskAgain) return current;
    if (!options?.force) {
        const alreadyAsked = await AsyncStorage.getItem(PERMISSION_ASKED_KEY);
        if (alreadyAsked) return current;
    }
    await AsyncStorage.setItem(PERMISSION_ASKED_KEY, 'true');
    return Notifications.requestPermissionsAsync();
}

/** Token Expo Push de l'appareil courant, null hors build natif sur device. */
async function currentPushToken(): Promise<string | null> {
    if (!pushSupported()) return null;
    const projectId: string | undefined =
        Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    if (!projectId) return null;
    const token = await Notifications.getExpoPushTokenAsync({ projectId });
    return token.data;
}

/**
 * Enregistre le token push de l'appareil pour le compte connecté (RPC
 * security definer : réaffecte la ligne si un autre compte détenait ce token).
 * Best-effort : un échec (hors ligne, permission refusée…) est silencieux,
 * la prochaine ouverture de session retentera.
 */
export async function registerPushToken(): Promise<void> {
    try {
        const permission = await ensurePushPermission();
        if (!permission?.granted) return;
        const token = await currentPushToken();
        if (!token) return;
        const { error } = await supabase.rpc('register_push_token', {
            p_token: token,
            p_platform: Platform.OS === 'ios' ? 'ios' : 'android',
        });
        if (error && __DEV__) {
            console.warn('Enregistrement du token push échoué :', error.message);
        }
    } catch (error) {
        if (__DEV__) {
            console.warn('Enregistrement du token push échoué :', error);
        }
    }
}

/**
 * Retire le token de l'appareil courant, à appeler AVANT signOut (après, plus
 * de session pour appeler la RPC — et le compte suivant sur ce téléphone ne
 * doit pas recevoir les push du précédent).
 */
export async function unregisterPushToken(): Promise<void> {
    try {
        const token = await currentPushToken();
        if (!token) return;
        const { error } = await supabase.rpc('unregister_push_token', { p_token: token });
        if (error && __DEV__) {
            console.warn('Désenregistrement du token push échoué :', error.message);
        }
    } catch (error) {
        if (__DEV__) {
            console.warn('Désenregistrement du token push échoué :', error);
        }
    }
}
