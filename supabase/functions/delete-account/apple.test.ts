import { describe, expect, it, vi } from 'vitest';
import { revokeAppleToken, signClientSecret } from './apple.ts';

async function makeKey() {
    const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, [
        'sign',
        'verify',
    ]);
    const der = new Uint8Array(await crypto.subtle.exportKey('pkcs8', pair.privateKey));
    const pem = `-----BEGIN PRIVATE KEY-----\n${btoa(String.fromCharCode(...der))}\n-----END PRIVATE KEY-----`;
    return { pem, publicKey: pair.publicKey };
}

function decode(part: string) {
    return JSON.parse(Buffer.from(part, 'base64url').toString('utf8'));
}

function response(status: number, body: unknown = {}) {
    return new Response(JSON.stringify(body), { status });
}

describe('signClientSecret', () => {
    it('signe un JWT ES256 vérifiable, aux claims attendus par Apple', async () => {
        const { pem, publicKey } = await makeKey();
        const jwt = await signClientSecret(
            { teamId: 'TEAM123456', keyId: 'KEY1234567', privateKey: pem },
            1_000_000,
        );
        const [header, claims, signature] = jwt.split('.');

        expect(decode(header)).toEqual({ alg: 'ES256', kid: 'KEY1234567' });
        expect(decode(claims)).toEqual({
            iss: 'TEAM123456',
            iat: 1_000_000,
            exp: 1_000_300,
            aud: 'https://appleid.apple.com',
            sub: 'com.cohozen.trycast',
        });
        const valid = await crypto.subtle.verify(
            { name: 'ECDSA', hash: 'SHA-256' },
            publicKey,
            Buffer.from(signature, 'base64url'),
            new TextEncoder().encode(`${header}.${claims}`),
        );
        expect(valid).toBe(true);
    });
});

describe('revokeAppleToken', () => {
    it('échange le code puis révoque le refresh token', async () => {
        const { pem } = await makeKey();
        const fetchFn = vi
            .fn()
            .mockResolvedValueOnce(response(200, { refresh_token: 'r1', access_token: 'a1' }))
            .mockResolvedValueOnce(response(200));

        const ok = await revokeAppleToken(
            'code-1',
            { teamId: 'T', keyId: 'K', privateKey: pem },
            fetchFn,
        );

        expect(ok).toBe(true);
        const [tokenUrl, tokenInit] = fetchFn.mock.calls[0];
        expect(tokenUrl).toBe('https://appleid.apple.com/auth/token');
        const tokenBody = tokenInit.body as URLSearchParams;
        expect(tokenBody.get('code')).toBe('code-1');
        expect(tokenBody.get('grant_type')).toBe('authorization_code');
        expect(tokenBody.get('client_id')).toBe('com.cohozen.trycast');

        const [revokeUrl, revokeInit] = fetchFn.mock.calls[1];
        expect(revokeUrl).toBe('https://appleid.apple.com/auth/revoke');
        const revokeBody = revokeInit.body as URLSearchParams;
        expect(revokeBody.get('token')).toBe('r1');
        expect(revokeBody.get('token_type_hint')).toBe('refresh_token');
    });

    it('rend false sans lever si Apple refuse le code', async () => {
        const { pem } = await makeKey();
        const fetchFn = vi.fn().mockResolvedValueOnce(response(400, { error: 'invalid_grant' }));
        vi.spyOn(console, 'error').mockImplementation(() => {});

        const ok = await revokeAppleToken(
            'expiré',
            { teamId: 'T', keyId: 'K', privateKey: pem },
            fetchFn,
        );

        expect(ok).toBe(false);
        expect(fetchFn).toHaveBeenCalledTimes(1);
    });

    it('rend false sans lever si la clé est invalide', async () => {
        const fetchFn = vi.fn();
        vi.spyOn(console, 'error').mockImplementation(() => {});

        const ok = await revokeAppleToken(
            'code',
            { teamId: 'T', keyId: 'K', privateKey: 'pas une clé' },
            fetchFn,
        );

        expect(ok).toBe(false);
        expect(fetchFn).not.toHaveBeenCalled();
    });
});
