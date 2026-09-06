import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * État local « guide d'accueil déjà vu » (device-only, pas de sync serveur).
 * Purement cosmétique : un utilisateur qui réinstalle le revoit, et c'est
 * volontaire — pas de colonne serveur pour ça.
 *
 * Ce flag a un second rôle, moins évident : tant qu'il n'est pas posé, la
 * demande spontanée de permission notifications est suspendue (voir
 * `use-register-push-token.ts`) pour que le dialogue système ne surgisse pas
 * par-dessus la sheet de bienvenue.
 */
const STORAGE_KEY = 'trycast.welcome-guide-seen';

/** Parse tolérant : seul 'true' vaut « déjà vu » (absent/corrompu ⇒ à montrer). */
export function parseWelcomeGuideSeen(stored: string | null | undefined): boolean {
    return stored === 'true';
}

export async function loadWelcomeGuideSeen(): Promise<boolean> {
    try {
        return parseWelcomeGuideSeen(await AsyncStorage.getItem(STORAGE_KEY));
    } catch {
        // Stockage indisponible : mieux vaut ne rien montrer que boucler sur
        // un guide qu'on ne peut de toute façon pas marquer comme vu.
        return true;
    }
}

export async function markWelcomeGuideSeen(): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEY, 'true');
}
