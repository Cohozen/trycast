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
