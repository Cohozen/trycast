// Révocation Sign in with Apple à la suppression du compte (règle 5.1.1(v) de
// l'App Store). Module pur (WebCrypto + fetch, zéro import Deno), testé sous
// Vitest.
//
// Rien n'est stocké : l'app rouvre la feuille Apple au moment de supprimer et
// envoie l'authorizationCode (valable 5 minutes, usage unique). On l'échange
// contre un jeton, qu'on révoque dans la foulée.
//
// Le client_secret est un JWT ES256 signé à chaque appel avec la clé .p8
// « Sign in with Apple » (secrets APPLE_TEAM_ID, APPLE_KEY_ID,
// APPLE_PRIVATE_KEY) : pas de secret à renouveler tous les six mois.

/** Bundle ID de l'app : le client_id d'un flux natif iOS. */
const APPLE_CLIENT_ID = 'com.cohozen.trycast';
const APPLE_AUDIENCE = 'https://appleid.apple.com';

export type AppleKeyConfig = {
    teamId: string;
    keyId: string;
    /** Contenu du fichier .p8 (PEM PKCS#8). */
    privateKey: string;
};

/**
 * Échange le code puis révoque le jeton obtenu. Ne lève jamais : un échec est
 * journalisé et rend `false`, la suppression du compte continue (décision du
 * 2026-09-25, le droit à l'effacement passe avant).
 */
export async function revokeAppleToken(
    authorizationCode: string,
    config: AppleKeyConfig,
    fetchFn: typeof fetch = fetch,
): Promise<boolean> {
    try {
        const clientSecret = await signClientSecret(config);

        const tokenResponse = await fetchFn(`${APPLE_AUDIENCE}/auth/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: APPLE_CLIENT_ID,
                client_secret: clientSecret,
                code: authorizationCode,
                grant_type: 'authorization_code',
            }),
        });
        if (!tokenResponse.ok) {
            throw new Error(`auth/token ${tokenResponse.status} ${await tokenResponse.text()}`);
        }
        const tokens = (await tokenResponse.json()) as {
            refresh_token?: string;
            access_token?: string;
        };
        const token = tokens.refresh_token ?? tokens.access_token;
        if (!token) {
            throw new Error('auth/token sans jeton');
        }

        const revokeResponse = await fetchFn(`${APPLE_AUDIENCE}/auth/revoke`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: APPLE_CLIENT_ID,
                client_secret: clientSecret,
                token,
                token_type_hint: tokens.refresh_token ? 'refresh_token' : 'access_token',
            }),
        });
        if (!revokeResponse.ok) {
            throw new Error(`auth/revoke ${revokeResponse.status} ${await revokeResponse.text()}`);
        }
        return true;
    } catch (error) {
        console.error('delete-account: révocation Apple échouée', {
            error: error instanceof Error ? error.message : String(error),
        });
        return false;
    }
}

/** JWT ES256 attendu par Apple en client_secret, valable 5 minutes. */
export async function signClientSecret(
    { teamId, keyId, privateKey }: AppleKeyConfig,
    now: number = Math.floor(Date.now() / 1000),
): Promise<string> {
    const header = base64url(JSON.stringify({ alg: 'ES256', kid: keyId }));
    const claims = base64url(
        JSON.stringify({
            iss: teamId,
            iat: now,
            exp: now + 300,
            aud: APPLE_AUDIENCE,
            sub: APPLE_CLIENT_ID,
        }),
    );
    const key = await crypto.subtle.importKey(
        'pkcs8',
        pemToDer(privateKey),
        { name: 'ECDSA', namedCurve: 'P-256' },
        false,
        ['sign'],
    );
    // WebCrypto rend la signature au format r||s, celui qu'exige JWS
    const signature = await crypto.subtle.sign(
        { name: 'ECDSA', hash: 'SHA-256' },
        key,
        new TextEncoder().encode(`${header}.${claims}`),
    );
    return `${header}.${claims}.${base64url(new Uint8Array(signature))}`;
}

function pemToDer(pem: string): Uint8Array {
    const body = pem.replace(/-----(BEGIN|END) PRIVATE KEY-----/g, '').replace(/\s/g, '');
    return Uint8Array.from(atob(body), (char) => char.charCodeAt(0));
}

function base64url(input: string | Uint8Array): string {
    const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : input;
    return btoa(String.fromCharCode(...bytes))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}
