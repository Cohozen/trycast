import { describe, expect, it } from 'vitest';
import { deriveNotificationsUi } from './derive-notifications-ui';
import { DEFAULT_NOTIFICATION_PREFS } from './types';

describe('deriveNotificationsUi', () => {
    it('master on : sous-toggles visibles, sous-titre « choisis »', () => {
        const ui = deriveNotificationsUi('granted', DEFAULT_NOTIFICATION_PREFS);
        expect(ui).toEqual({
            masterOn: true,
            masterDisabled: false,
            subtitleKey: 'profile:settings.notifications.master.subtitleOn',
            showBanner: false,
            showToggles: true,
        });
    });

    it('master off : tout coupé, sous-toggles masqués', () => {
        const ui = deriveNotificationsUi('granted', {
            ...DEFAULT_NOTIFICATION_PREFS,
            master: false,
        });
        expect(ui).toEqual({
            masterOn: false,
            masterDisabled: false,
            subtitleKey: 'profile:settings.notifications.master.subtitleOff',
            showBanner: false,
            showToggles: false,
        });
    });

    it('permission OS refusée : master forcé off et non interactif, bannière', () => {
        const ui = deriveNotificationsUi('denied', DEFAULT_NOTIFICATION_PREFS);
        expect(ui).toEqual({
            masterOn: false,
            masterDisabled: true,
            subtitleKey: 'profile:settings.notifications.master.subtitleBlocked',
            showBanner: true,
            showToggles: false,
        });
    });

    it('permission jamais demandée : pas de bannière, prefs affichées telles quelles', () => {
        const ui = deriveNotificationsUi('undetermined', DEFAULT_NOTIFICATION_PREFS);
        expect(ui.showBanner).toBe(false);
        expect(ui.masterOn).toBe(true);
        expect(ui.masterDisabled).toBe(false);
    });
});
