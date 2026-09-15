import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * État local « pronos déjà célébrés » (device-only, pas de sync serveur).
 * `initialized` distingue le tout premier lancement de la feature : on y
 * absorbe l'historique sans rien afficher (anti-rétroactif), sinon un
 * utilisateur existant verrait remonter tous ses anciens gains d'un coup.
 */
export type CelebratedState = {
    initialized: boolean;
    matchIds: string[];
};

const STORAGE_KEY = 'trycast.celebrated-matches';
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

export async function loadCelebratedState(): Promise<CelebratedState> {
    return parseCelebratedState(await AsyncStorage.getItem(STORAGE_KEY));
}

export async function saveCelebratedState(state: CelebratedState): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
