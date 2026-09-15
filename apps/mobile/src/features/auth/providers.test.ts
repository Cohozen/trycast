import { describe, expect, it } from 'vitest';

import {
    type OAuthProviderId,
    type ProviderDefinition,
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
        labelKey: 'auth:actions.continueWithGoogle',
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
