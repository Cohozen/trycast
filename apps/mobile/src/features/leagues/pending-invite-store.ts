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
 * Codes déjà présentés à l'utilisateur depuis le démarrage de l'app.
 *
 * `redirectSystemPath` retient le code **avant** de rediriger, sans pouvoir
 * savoir si sa redirection aboutira — c'est le rôle même de cette mémoire.
 * Quand elle aboutit, l'écriture devient inutile, et il se trouve qu'elle
 * arrive parfois *après* le nettoyage : Expo Router traite le lien une fois
 * l'app montée, pas avant (observé au simulateur le 2026-09-09, traces
 * `purge` → `intent` → `save` dans cet ordre). S'en remettre à l'ordre de ces
 * étapes serait donc illusoire ; on note plutôt ce qui a déjà été montré, et
 * une invitation honorée ne se rejoue pas, quel que soit l'ordre.
 *
 * Volontairement en mémoire : la question ne se pose que dans une exécution.
 */
const honored = new Set<string>();

/** L'écran d'adhésion a affiché ce code : il n'y a plus rien à rejouer. */
export function markInviteHonored(code: string): void {
    honored.add(code);
}

/** Vrai si ce code a déjà été présenté depuis le démarrage. */
export function isInviteHonored(code: string): boolean {
    return honored.has(code);
}

/** Remet la mémoire à zéro — réservé aux tests. */
export function resetHonoredInvites(): void {
    honored.clear();
}

/**
 * Lit **et efface** l'invitation en attente. Rend `null` pour un code déjà
 * honoré, tout en l'effaçant quand même : le stockage doit se vider même
 * lorsqu'il n'y a rien à rejouer, sans quoi l'invitation ressurgirait au
 * lancement suivant.
 */
export async function takePendingInvite(): Promise<string | null> {
    try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored === null) return null;
        await AsyncStorage.removeItem(STORAGE_KEY);
        const code = parsePendingInvite(stored, Date.now());
        return code && !isInviteHonored(code) ? code : null;
    } catch {
        return null;
    }
}
