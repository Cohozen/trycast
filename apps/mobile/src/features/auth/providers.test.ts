import { describe, expect, it } from 'vitest';

import {
    type OAuthProviderId,
    type ProviderDefinition,
    providersToRevoke,
    resolveProviders,
} from '@/features/auth/providers';

// Jeu de définitions dédié : le test porte sur la logique de filtrage, pas sur
// la liste réelle des fournisseurs (qui change au fil des lots).
const definitions: ProviderDefinition[] = [
    {
        id: 'google',
        labelKey: 'auth:actions.continueWithGoogle',
        flows: { android: 'native-id-token', ios: 'native-id-token' },
    },
    {
        id: 'apple',
        labelKey: 'auth:actions.continueWithApple',
        flows: { ios: 'native-id-token', android: 'web-redirect' },
    },
];

const allConfigured = () => true;

describe('resolveProviders', () => {
    it('retient la mécanique propre à la plateforme', () => {
        const android = resolveProviders('android', definitions, allConfigured);
        const ios = resolveProviders('ios', definitions, allConfigured);

        expect(android.map((p) => [p.id, p.flow])).toEqual([
            ['google', 'native-id-token'],
            ['apple', 'web-redirect'],
        ]);
        expect(ios.map((p) => [p.id, p.flow])).toEqual([
            ['google', 'native-id-token'],
            ['apple', 'native-id-token'],
        ]);
    });

    it('écarte un fournisseur non proposé sur la plateforme', () => {
        const iosOnly: ProviderDefinition[] = [
            {
                id: 'google',
                labelKey: 'auth:actions.continueWithGoogle',
                flows: { ios: 'native-id-token' },
            },
        ];

        expect(resolveProviders('android', iosOnly, allConfigured)).toEqual([]);
    });

    it('écarte un fournisseur dont les identifiants manquent', () => {
        const isConfigured = (id: OAuthProviderId) => id === 'google';

        expect(resolveProviders('android', definitions, isConfigured).map((p) => p.id)).toEqual([
            'google',
        ]);
    });

    it('ne propose rien quand rien n’est configuré — l’app reste utilisable', () => {
        expect(resolveProviders('android', definitions, () => false)).toEqual([]);
    });
});

// Liste réelle : Apple ne dépend d'aucune variable d'environnement, contrairement
// à Google, ce qui rend ces assertions stables en CI.
describe('Sign in with Apple', () => {
    it('est proposé en premier sur iOS', () => {
        expect(resolveProviders('ios')[0]).toEqual({
            id: 'apple',
            flow: 'native-id-token',
            labelKey: 'auth:actions.continueWithApple',
        });
    });

    it("n'est jamais proposé sur Android", () => {
        expect(resolveProviders('android').map((p) => p.id)).not.toContain('apple');
    });
});

describe('providersToRevoke', () => {
    const withRevocation: ProviderDefinition[] = [
        definitions[0],
        { ...definitions[1], revokeOnDeletion: true },
    ];

    it('ne retient que les fournisseurs du compte marqués à révoquer', () => {
        expect(providersToRevoke(['email', 'apple'], withRevocation)).toEqual(['apple']);
        expect(providersToRevoke(['google'], withRevocation)).toEqual([]);
        expect(providersToRevoke(['email'], withRevocation)).toEqual([]);
    });

    it('marque Apple dans la liste réelle', () => {
        expect(providersToRevoke(['apple', 'google'])).toEqual(['apple']);
    });
});
