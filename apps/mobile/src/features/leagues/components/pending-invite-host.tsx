import { usePendingInvite } from '../use-pending-invite';

/**
 * Point de montage de `usePendingInvite` : le hook lit le contexte du guide
 * d'accueil, il doit donc vivre *sous* `WelcomeGuideProvider`, que le layout
 * `(app)` monte lui-même. Sans rendu propre — même rôle d'hôte que
 * `CelebrationHost`.
 */
export function PendingInviteHost() {
    usePendingInvite();
    return null;
}
