import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * État local « pronos déjà célébrés » (device-only, pas de sync serveur), PAR
 * COMPTE : deux comptes sur un même appareil ne partagent ni leurs matchs
 * célébrés ni leur initialisation. `initialized` distingue la première visite
 * d'un compte sur l'appareil : on y absorbe l'historique sans rien afficher
 * (anti-rétroactif), sinon il verrait remonter tous ses anciens gains d'un coup.
 */
export type CelebratedState = {
    initialized: boolean;
    matchIds: string[];
};

// Clé d'avant la séparation par compte (partagée par tous les comptes de
// l'appareil) : reprise par le premier compte qui ouvre l'app, puis supprimée.
const LEGACY_KEY = 'trycast.celebrated-matches';
const EMPTY: CelebratedState = { initialized: false, matchIds: [] };

/** Parse tolérant du blob persisté (repli sur l'état vide si absent/corrompu). */
export function parseCelebratedState(raw: string | null): CelebratedState {
    if (!raw) {
        return EMPTY;
    }
    try {
        const value: unknown = JSON.parse(raw);
        if (value === null || typeof value !== 'object' || !('matchIds' in value)) {
            return EMPTY;
        }
        const record = value as Record<string, unknown>;
        if (!Array.isArray(record.matchIds)) {
            return EMPTY;
        }
        return {
            initialized: record.initialized === true,
            matchIds: record.matchIds.filter((id): id is string => typeof id === 'string'),
        };
    } catch {
        // Blob corrompu : on repart proprement d'un état vide.
        return EMPTY;
    }
}

/** Marque des matchs comme célébrés (union sans doublon) et scelle l'initialisation. */
export function withCelebrated(state: CelebratedState, matchIds: string[]): CelebratedState {
    return {
        initialized: true,
        matchIds: [...new Set([...state.matchIds, ...matchIds])],
    };
}

export function celebratedStorageKey(userId: string): string {
    return `${LEGACY_KEY}.${userId}`;
}

/**
 * État d'un compte : le sien s'il existe, sinon la clé héritée (migration :
 * le cas courant d'un seul compte par appareil ne perd aucun récap en attente),
 * sinon l'état vide non initialisé.
 */
export function resolveCelebratedState(
    own: string | null,
    legacy: string | null,
): { state: CelebratedState; fromLegacy: boolean } {
    if (own !== null) {
        return { state: parseCelebratedState(own), fromLegacy: false };
    }
    return { state: parseCelebratedState(legacy), fromLegacy: legacy !== null };
}

export async function loadCelebratedState(userId: string): Promise<CelebratedState> {
    const [own, legacy] = await Promise.all([
        AsyncStorage.getItem(celebratedStorageKey(userId)),
        AsyncStorage.getItem(LEGACY_KEY),
    ]);
    const { state, fromLegacy } = resolveCelebratedState(own, legacy);
    if (fromLegacy) {
        await saveCelebratedState(userId, state);
    }
    if (legacy !== null) {
        await AsyncStorage.removeItem(LEGACY_KEY);
    }
    return state;
}

export async function saveCelebratedState(userId: string, state: CelebratedState): Promise<void> {
    await AsyncStorage.setItem(celebratedStorageKey(userId), JSON.stringify(state));
}
