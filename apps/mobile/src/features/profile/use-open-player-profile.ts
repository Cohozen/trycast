import { useRouter } from 'expo-router';

/**
 * Fabrique le `onPress` d'ouverture du profil public d'un joueur, à poser sur
 * une ligne de classement ou de pronos.
 *
 * Rend `undefined` pour l'utilisateur connecté : on ne consulte pas son propre
 * profil depuis un classement (décision Corentin, 2026-07-24), et une ligne
 * sans `onPress` reste inerte. La règle vit ici plutôt qu'à chaque appel :
 * c'est ce qui garantit qu'aucun écran ne l'oublie.
 *
 * `tab` ouvre le profil sur un onglet : `predictions` depuis la liste des
 * pronos d'un match (on veut voir ses autres pronos, pas ses stats).
 */
export function useOpenPlayerProfile(meUserId: string | undefined, tab?: 'predictions') {
    const router = useRouter();
    return (targetUserId: string) =>
        targetUserId === meUserId
            ? undefined
            : () =>
                  router.push({
                      pathname: '/player/[id]',
                      params: tab ? { id: targetUserId, tab } : { id: targetUserId },
                  });
}
