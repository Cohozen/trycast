import { describe, expect, it } from 'vitest';
import {
    analyzeTickets,
    chunk,
    type ExpoPushMessage,
    type ExpoPushTicket,
    unregisteredTokensFromReceipts,
} from './expo-push.ts';

function message(to: string): ExpoPushMessage {
    return { to, title: 't', body: 'b' };
}

describe('chunk', () => {
    it('découpe en lots de la taille demandée', () => {
        expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    });

    it('retourne zéro lot pour une liste vide', () => {
        expect(chunk([], 100)).toEqual([]);
    });

    it('retourne un seul lot quand la liste tient dedans', () => {
        expect(chunk([1, 2], 100)).toEqual([[1, 2]]);
    });
});

describe('analyzeTickets', () => {
    const messages = [message('tok-a'), message('tok-b'), message('tok-c')];

    it('apparie les tickets ok à leur token', () => {
        const tickets: ExpoPushTicket[] = [
            { status: 'ok', id: 'id-1' },
            { status: 'ok', id: 'id-2' },
            { status: 'ok', id: 'id-3' },
        ];
        const outcome = analyzeTickets(messages, tickets);
        expect(outcome.pairs).toEqual([
            { id: 'id-1', token: 'tok-a', index: 0 },
            { id: 'id-2', token: 'tok-b', index: 1 },
            { id: 'id-3', token: 'tok-c', index: 2 },
        ]);
        expect(outcome.unregisteredTokens).toEqual([]);
        expect(outcome.errors).toEqual([]);
    });

    it('isole les tokens morts (DeviceNotRegistered) des autres erreurs', () => {
        const tickets: ExpoPushTicket[] = [
            { status: 'ok', id: 'id-1' },
            { status: 'error', details: { error: 'DeviceNotRegistered' } },
            { status: 'error', message: 'quota', details: { error: 'MessageRateExceeded' } },
        ];
        const outcome = analyzeTickets(messages, tickets);
        expect(outcome.pairs).toEqual([{ id: 'id-1', token: 'tok-a', index: 0 }]);
        expect(outcome.unregisteredTokens).toEqual(['tok-b']);
        expect(outcome.errors).toEqual(['ticket tok-c: MessageRateExceeded']);
    });
});

describe('unregisteredTokensFromReceipts', () => {
    it('remonte les tokens dont le receipt est DeviceNotRegistered, sans doublon', () => {
        const pairs = [
            { id: 'id-1', token: 'tok-a' },
            { id: 'id-2', token: 'tok-a' },
            { id: 'id-3', token: 'tok-b' },
            { id: 'id-4', token: 'tok-c' },
        ];
        const tokens = unregisteredTokensFromReceipts(pairs, {
            'id-1': { status: 'error', details: { error: 'DeviceNotRegistered' } },
            'id-2': { status: 'error', details: { error: 'DeviceNotRegistered' } },
            'id-3': { status: 'ok' },
            // id-4 : receipt pas encore disponible
        });
        expect(tokens).toEqual(['tok-a']);
    });

    it('ignore les erreurs de receipt qui ne condamnent pas le token', () => {
        const tokens = unregisteredTokensFromReceipts([{ id: 'id-1', token: 'tok-a' }], {
            'id-1': { status: 'error', message: 'trop gros', details: { error: 'MessageTooBig' } },
        });
        expect(tokens).toEqual([]);
    });
});
