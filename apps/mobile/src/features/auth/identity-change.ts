/**
 * Le cache TanStack Query est un singleton de module, partagé par toutes les
 * sessions successives de l'app. Beaucoup de clés n'embarquent pas d'id
 * utilisateur — c'est volontaire côté serveur (la RLS ne renvoie déjà que les
 * lignes du compte connecté, cf. useMyPredictions), mais ça rend le cache
 * ambigu dès qu'un deuxième compte se connecte sans redémarrage : les données
 * du compte précédent restent affichées, le temps du refetch au minimum.
 *
 * D'où la règle : à chaque CHANGEMENT d'identité, le cache est vidé en entier.
 * Vider sur un simple rafraîchissement de token (même utilisateur, événements
 * TOKEN_REFRESHED / USER_UPDATED) provoquerait des refetch en rafale — d'où la
 * comparaison sur l'id, pas sur l'événement.
 */

/** Id inconnu tant que la session initiale n'a pas été lue. */
export type KnownUserId = string | null | undefined;

/**
 * Faut-il vider le cache ? Oui si l'utilisateur change ou se déconnecte, non à
 * la toute première résolution de session (`undefined` : il n'y a rien à jeter,
 * et l'app démarre justement en restaurant cette session).
 */
export function hasIdentityChanged(previous: KnownUserId, next: string | null): boolean {
    return previous !== undefined && previous !== next;
}
