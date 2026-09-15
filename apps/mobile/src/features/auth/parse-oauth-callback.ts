/**
 * Résultat de l'URL sur laquelle le navigateur système renvoie l'app à la fin
 * d'un parcours OAuth `web-redirect`.
 */
export type OAuthCallback =
    | { type: 'session'; accessToken: string; refreshToken: string }
    | { type: 'error'; description: string };

function decode(value: string): string {
    try {
        return decodeURIComponent(value.replace(/\+/g, ' '));
    } catch {
        // Une séquence % invalide ne doit pas faire exploser la lecture de l'URL
        return value;
    }
}

function parsePairs(part: string): Record<string, string> {
    const params: Record<string, string> = {};
    for (const chunk of part.split('&')) {
        if (!chunk) continue;
        const separator = chunk.indexOf('=');
        const key = decode(separator === -1 ? chunk : chunk.slice(0, separator));
        params[key] = separator === -1 ? '' : decode(chunk.slice(separator + 1));
    }
    return params;
}

/**
 * Lit l'URL de retour d'un parcours OAuth par navigateur.
 *
 * Le client Supabase est en `flowType: 'implicit'` (valeur par défaut, conservée
 * pour ne pas toucher aux parcours e-mail déjà validés) : les jetons reviennent
 * donc dans le **fragment** (`#access_token=…`), pas dans la query. Les erreurs,
 * elles, arrivent dans l'un ou l'autre selon l'étape qui a échoué — d'où la
 * lecture des deux, le fragment ayant le dernier mot.
 *
 * Aucune dépendance à `URL`/`URLSearchParams` : leurs implémentations sous
 * Hermes sont partielles, et cette fonction doit rester testable telle quelle.
 */
export function parseOAuthCallback(url: string): OAuthCallback {
    const hashAt = url.indexOf('#');
    const fragment = hashAt === -1 ? '' : url.slice(hashAt + 1);

    const head = hashAt === -1 ? url : url.slice(0, hashAt);
    const queryAt = head.indexOf('?');
    const query = queryAt === -1 ? '' : head.slice(queryAt + 1);

    const params = { ...parsePairs(query), ...parsePairs(fragment) };

    if (params.error || params.error_description) {
        return {
            type: 'error',
            description: params.error_description || params.error || '',
        };
    }

    const accessToken = params.access_token;
    const refreshToken = params.refresh_token;
    if (!accessToken || !refreshToken) {
        return { type: 'error', description: 'callback OAuth sans jeton de session' };
    }

    return { type: 'session', accessToken, refreshToken };
}
