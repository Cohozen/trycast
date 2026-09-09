import AsyncStorage from '@react-native-async-storage/async-storage';

import { normalizeInviteCode } from './validation';

/**
 * Code d'invitation reçu par lien mais pas encore consommé (device-only, comme
 * `welcome-guide-store`).
 *
 * Il existe pour une seule raison : les trois `<Stack.Protected>` de
 * `src/app/_layout.tsx` renvoient vers `(auth)` un visiteur sans session, et
 * l'intention de navigation serait perdue en route. On l'écrit donc dès la
 * réception du lien (`+native-intent`), et on la rejoue une fois le compte
 * créé et le pseudo choisi.
 *
 * La valeur est horodatée et **périmée au bout de 24 h** : un code oublié là
 * ne doit pas ressurgir des semaines plus tard, au lancement suivant, sur une
 * ligue que l'utilisateur n'a plus aucune raison de rejoindre.
 */
const STORAGE_KEY = 'trycast.pending-invite';

/** Au-delà, l'invitation est considérée abandonnée. */
export const PENDING_INVITE_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Parse tolérant : toute valeur illisible, périmée, ou dont le code ne respecte
 * pas l'alphabet du serveur rend `null`. On revalide le code même s'il a été
 * validé à l'écriture — c'est ce qui garantit qu'une valeur trafiquée dans le
 * stockage ne pilote pas une navigation.
 */
export function parsePendingInvite(stored: string | null | undefined, now: number): string | null {
    if (!stored) return null;
    try {
        const parsed: unknown = JSON.parse(stored);
        if (typeof parsed !== 'object' || parsed === null) return null;
        const { code, at } = parsed as { code?: unknown; at?: unknown };
        if (typeof code !== 'string' || typeof at !== 'number') return null;
        if (!Number.isFinite(at) || now - at > PENDING_INVITE_TTL_MS) return null;
        return normalizeInviteCode(code);
    } catch {
        return null;
    }
}

/** Sérialisation symétrique de `parsePendingInvite`. */
export function serializePendingInvite(code: string, now: number): string {
    return JSON.stringify({ code, at: now });
}

/**
 * Retient un code reçu par lien. Un code mal formé n'est pas écrit : mieux vaut
 * ne rien retenir que rejouer une navigation vers un code impossible.
 */
export async function savePendingInvite(code: string): Promise<void> {
    const normalized = normalizeInviteCode(code);
    if (!normalized) return;
    try {
        await AsyncStorage.setItem(STORAGE_KEY, serializePendingInvite(normalized, Date.now()));
    } catch {
        // Stockage indisponible : le lien reste utilisable tant que l'app est
        // ouverte, on perd seulement le rattrapage après inscription.
    }
}

/**
 * Lit **et efface** l'invitation en attente : une invitation ne se rejoue
 * jamais deux fois, même si la navigation qui suit échoue.
 */
export async function takePendingInvite(): Promise<string | null> {
    try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored === null) return null;
        await AsyncStorage.removeItem(STORAGE_KEY);
        return parsePendingInvite(stored, Date.now());
    } catch {
        return null;
    }
}
