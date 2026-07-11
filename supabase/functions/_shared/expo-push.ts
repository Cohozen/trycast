// Client Expo Push API (Lot 6) : envoi des messages par lots, lecture des
// receipts, détection des tokens morts (DeviceNotRegistered). Un message par
// token (jamais de `to` multiple) : les tickets restent alignés 1:1 sur les
// messages, ce qui permet d'attribuer chaque erreur à son token.
// Les fonctions réseau utilisent fetch (global) ; la logique pure (chunk,
// analyse des tickets/receipts) est testée sous Vitest.

const PUSH_SEND_URL = 'https://exp.host/--/api/v2/push/send';
const PUSH_RECEIPTS_URL = 'https://exp.host/--/api/v2/push/getReceipts';

// Limites documentées de l'Expo Push API
export const SEND_BATCH_SIZE = 100;
export const RECEIPT_BATCH_SIZE = 300;

export type ExpoPushMessage = {
    to: string;
    title: string;
    body: string;
    data?: Record<string, unknown>;
    channelId?: string;
    sound?: 'default';
};

export type ExpoPushTicket =
    | { status: 'ok'; id: string }
    | { status: 'error'; message?: string; details?: { error?: string } };

export type ExpoPushReceipt =
    | { status: 'ok' }
    | { status: 'error'; message?: string; details?: { error?: string } };

/** Ticket accepté par Expo, mémorisé avec son token pour la phase receipts. */
export type TicketPair = { id: string; token: string };

export type TicketOutcome = {
    /** Tickets ok, à vérifier en receipts au tick suivant */
    pairs: TicketPair[];
    /** Tokens morts à supprimer de push_tokens */
    unregisteredTokens: string[];
    /** Autres erreurs de ticket (message d'erreur Expo) */
    errors: string[];
};

export function chunk<T>(items: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let index = 0; index < items.length; index += size) {
        chunks.push(items.slice(index, index + size));
    }
    return chunks;
}

/**
 * Dépouille les tickets d'un envoi (alignés 1:1 sur les messages) : sépare
 * les acceptés, les tokens morts et les autres erreurs.
 */
export function analyzeTickets(
    messages: ExpoPushMessage[],
    tickets: ExpoPushTicket[],
): TicketOutcome {
    const outcome: TicketOutcome = { pairs: [], unregisteredTokens: [], errors: [] };
    tickets.forEach((ticket, index) => {
        const token = messages[index]?.to;
        if (!token) {
            outcome.errors.push('ticket sans message correspondant');
            return;
        }
        if (ticket.status === 'ok') {
            outcome.pairs.push({ id: ticket.id, token });
            return;
        }
        if (ticket.details?.error === 'DeviceNotRegistered') {
            outcome.unregisteredTokens.push(token);
            return;
        }
        outcome.errors.push(
            `ticket ${token}: ${ticket.details?.error ?? ticket.message ?? 'inconnu'}`,
        );
    });
    return outcome;
}

/** Tokens morts d'après les receipts (via l'appariement ticket → token). */
export function unregisteredTokensFromReceipts(
    pairs: TicketPair[],
    receipts: Record<string, ExpoPushReceipt>,
): string[] {
    const tokens = new Set<string>();
    for (const pair of pairs) {
        const receipt = receipts[pair.id];
        if (receipt?.status === 'error' && receipt.details?.error === 'DeviceNotRegistered') {
            tokens.add(pair.token);
        }
    }
    return [...tokens];
}

/**
 * Envoie les messages par lots de 100. Retourne les tickets alignés sur
 * l'ordre des messages. Un lot en échec HTTP fait échouer tout l'appel :
 * l'appelant marque ses envois en erreur (le claim-first garantit qu'ils ne
 * seront pas re-tentés — perte assumée plutôt que double envoi).
 */
export async function sendPushMessages(messages: ExpoPushMessage[]): Promise<ExpoPushTicket[]> {
    const tickets: ExpoPushTicket[] = [];
    for (const batch of chunk(messages, SEND_BATCH_SIZE)) {
        const response = await fetch(PUSH_SEND_URL, {
            method: 'POST',
            headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
            body: JSON.stringify(batch),
        });
        if (!response.ok) {
            throw new Error(`expo push send: HTTP ${response.status}`);
        }
        const payload = (await response.json()) as { data?: ExpoPushTicket[] };
        if (!Array.isArray(payload.data) || payload.data.length !== batch.length) {
            throw new Error('expo push send: réponse inattendue (tickets non alignés)');
        }
        tickets.push(...payload.data);
    }
    return tickets;
}

/** Lit les receipts par lots de 300. Retourne la map id → receipt. */
export async function checkReceipts(ticketIds: string[]): Promise<Record<string, ExpoPushReceipt>> {
    const receipts: Record<string, ExpoPushReceipt> = {};
    for (const batch of chunk(ticketIds, RECEIPT_BATCH_SIZE)) {
        const response = await fetch(PUSH_RECEIPTS_URL, {
            method: 'POST',
            headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids: batch }),
        });
        if (!response.ok) {
            throw new Error(`expo push receipts: HTTP ${response.status}`);
        }
        const payload = (await response.json()) as { data?: Record<string, ExpoPushReceipt> };
        Object.assign(receipts, payload.data ?? {});
    }
    return receipts;
}
