/**
 * Renvoi du code de réinitialisation : GoTrue refuse deux e-mails de recovery
 * rapprochés pour un même compte (`max_frequency`, 60 s sur le projet hébergé)
 * et répond 429 `over_email_send_rate_limit`. L'app tient le même délai côté
 * client pour ne pas proposer une action vouée à échouer.
 */
export const RESEND_COOLDOWN_MS = 60_000;

/**
 * Secondes restantes avant de pouvoir redemander un code (0 si c'est déjà
 * possible). Arrondi au supérieur : tant qu'il reste la moindre milliseconde,
 * le décompte affiche au moins 1 et le bouton reste fermé.
 */
export function resendCooldownSeconds(lastSentAt: number | null, now: number): number {
    if (lastSentAt === null) {
        return 0;
    }
    // Horloge qui recule (changement de fuseau, resynchronisation) : on ne
    // laisse jamais le décompte dépasser la durée nominale.
    const elapsed = Math.min(Math.max(now - lastSentAt, 0), RESEND_COOLDOWN_MS);
    return Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000);
}
