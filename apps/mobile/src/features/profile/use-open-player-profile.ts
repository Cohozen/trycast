import { useRouter } from 'expo-router';

/**
 * Fabrique le `onPress` d'ouverture du profil public d'un joueur, à poser sur
 * une ligne de classement ou de pronos.
 *
 * Rend `undefined` pour l'utilisateur connecté : on ne consulte pas son propre
 * profil depuis un classement (décision Corentin, 2026-07-24), et une ligne
 * sans `onPress` reste inerte. La règle vit ici plutôt qu'à chaque appel :
 * c'est ce qui garantit qu'aucun écran ne l'oublie.
 */
export function useOpenPlayerProfile(meUserId: string | undefined) {
    const router = useRouter();
    return (targetUserId: string) =>
        targetUserId === meUserId
            ? undefined
            : () => router.push({ pathname: '/player/[id]', params: { id: targetUserId } });
}
