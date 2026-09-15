import * as Haptics from 'expo-haptics';

// L'appel natif rejette si le module n'est pas dans le build installé ou si le
// device ne supporte pas le haptique : un retour tactile ne doit jamais casser l'UI.
const swallow = (promise: Promise<void>) => {
    promise.catch(() => {});
};

/** Signal fort, réservé aux confirmations qui comptent (prono enregistré…). */
export function hapticSuccess() {
    swallow(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
}

/** Tick discret pour les actions mineures (copie d'un code…). */
export function hapticLight() {
    swallow(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
}
