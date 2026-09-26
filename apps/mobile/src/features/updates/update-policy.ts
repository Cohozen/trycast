/**
 * Quand chercher une mise à jour à distance, et quand l'appliquer sans
 * demander. expo-updates ne cherche seul qu'au démarrage à froid : une app
 * gardée en arrière-plan des jours ne recevrait jamais un correctif. On
 * cherche donc aussi au retour au premier plan, sans marteler le serveur.
 */

/** Écart minimal entre deux recherches déclenchées par un retour au premier plan. */
export const CHECK_INTERVAL_MS = 15 * 60 * 1000;

/**
 * Absence au-delà de laquelle une mise à jour en attente s'applique d'elle-même
 * au retour : l'utilisateur n'a plus de contexte à perdre (les pronos sont
 * enregistrés côté serveur), et le rechargement passe pour une réouverture.
 */
export const SILENT_RELOAD_AFTER_MS = 10 * 60 * 1000;

/** `lastCheck` absent = aucune recherche depuis le lancement : on cherche. */
export function shouldCheckForUpdate(lastCheck: Date | undefined, now: number): boolean {
    return !lastCheck || now - lastCheck.getTime() >= CHECK_INTERVAL_MS;
}

/**
 * Délai laissé au système, après le retour au premier plan, pour livrer le lien
 * ou le tap de notification qui a rouvert l'app : selon la plateforme et le
 * type de lien, il arrive avant ou après le passage à `active`.
 */
export const RESUME_SETTLE_MS = 1000;

/**
 * Une app rouverte par un lien (invitation) ou un tap de notification ne se
 * recharge jamais d'elle-même : le rechargement pourrait perdre la
 * destination. Le toast « Redémarrer » prend le relais.
 */
export function shouldReloadSilently({
    pending,
    backgroundedAt,
    linkedAt,
    now,
}: {
    pending: boolean;
    /** Instant du dernier passage en arrière-plan, `null` s'il n'y en a pas eu. */
    backgroundedAt: number | null;
    /** Instant du dernier lien ou tap de notification reçu, `null` s'il n'y en a pas eu. */
    linkedAt: number | null;
    now: number;
}): boolean {
    if (!pending || backgroundedAt === null) return false;
    if (linkedAt !== null && linkedAt >= backgroundedAt) return false;
    return now - backgroundedAt >= SILENT_RELOAD_AFTER_MS;
}
