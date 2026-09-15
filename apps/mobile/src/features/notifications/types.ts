import type { Database } from '@/lib/database.types';

export type NotificationPrefsRow = Database['public']['Tables']['notification_prefs']['Row'];

/** Préférences côté écran. Absence de ligne en DB = tout activé. */
export type NotificationPrefs = {
    master: boolean;
    reminderEnabled: boolean;
    resultsEnabled: boolean;
};

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
    master: true,
    reminderEnabled: true,
    resultsEnabled: true,
};

type NotificationSendRow = Database['public']['Tables']['notification_sends']['Row'];

/**
 * Une notification de la boîte de réception. Seules les lignes réellement
 * envoyées y entrent — l'EF notify n'écrit title/body/url qu'au passage en
 * status='sent', d'où le resserrement de ces colonnes en non-nullables ici.
 */
export type AppNotification = Pick<NotificationSendRow, 'id' | 'read_at' | 'created_at'> & {
    type: string;
    title: string;
    body: string;
    url: string | null;
};
