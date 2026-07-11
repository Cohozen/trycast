// Notifications push (Lot 6) : rappels de prono à H-1 et résultats après la
// passe 1 du scoring. Appelée par pg_cron toutes les 10 minutes (décalée de
// 3 min après sync-results pour suivre le scoring de près). Même gabarit que
// sync-results : early-exit sans écriture si aucun travail, accès protégé par
// x-sync-secret, écritures via la service_role key.
//
// Idempotence : les cibles viennent des RPC notify_*_targets (« cibles − déjà
// notifiés ») et chaque envoi est CLAIMÉ dans notification_sends (on conflict
// do nothing) avant l'appel à l'Expo Push API — un crash entre claim et envoi
// perd la notification plutôt que de risquer un doublon. Les tokens morts
// (DeviceNotRegistered, dans les tickets ou les receipts du tick suivant)
// sont supprimés de push_tokens.
import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2';
import {
    analyzeTickets,
    checkReceipts,
    type ExpoPushMessage,
    sendPushMessages,
    type TicketPair,
    unregisteredTokensFromReceipts,
} from '../_shared/expo-push.ts';
import {
    groupTargets,
    type ReminderTargetRow,
    reminderMessages,
    type ResultTargetRow,
    resultMessages,
    type TargetGroup,
} from './transform.ts';

// Les receipts Expo sont disponibles ~15 min après l'envoi
const RECEIPT_DELAY_MS = 15 * 60 * 1000;

type SendType = 'reminder' | 'result';

type PendingReceiptRow = { id: string; ticket_ids: TicketPair[] | null };

type RunState = {
    remindersSent: number;
    resultsSent: number;
    tokensPruned: number;
    receiptsChecked: number;
    errors: string[];
};

Deno.serve(async (req: Request) => {
    if (req.method !== 'POST') {
        return json({ error: 'method_not_allowed' }, 405);
    }
    if (req.headers.get('x-sync-secret') !== Deno.env.get('NOTIFY_SECRET')) {
        return json({ error: 'unauthorized' }, 401);
    }

    const admin = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const [pendingReceipts, reminderRows, resultRows] = await Promise.all([
        selectPendingReceipts(admin),
        selectTargets<ReminderTargetRow>(admin, 'notify_reminder_targets'),
        selectTargets<ResultTargetRow>(admin, 'notify_result_targets'),
    ]);
    if (pendingReceipts.length === 0 && reminderRows.length === 0 && resultRows.length === 0) {
        return json({ skipped: true }, 200);
    }

    const { data: run, error: runError } = await admin
        .from('job_runs')
        .insert({ job: 'notify' })
        .select('id')
        .single();
    if (runError || !run) {
        console.error('notify: job_runs insert failed', runError?.message);
        return json({ error: 'job_run_insert_failed' }, 500);
    }

    const state: RunState = {
        remindersSent: 0,
        resultsSent: 0,
        tokensPruned: 0,
        receiptsChecked: 0,
        errors: [],
    };

    try {
        // Chaque phase encaisse ses propres échecs : un problème de receipts
        // ne bloque pas les rappels, et réciproquement.
        await processReceipts(admin, pendingReceipts, state);
        await processTargets(admin, 'reminder', groupTargets(reminderRows), state);
        await processTargets(admin, 'result', groupTargets(resultRows), state);

        await finishRun(admin, run.id, state.errors.length === 0 ? 'success' : 'error', state);
        return json({ success: true }, 200);
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error('notify failed', message);
        state.errors.push(message);
        await finishRun(admin, run.id, 'error', state);
        return json({ error: 'notify_failed' }, 500);
    }
});

/** Envois acceptés par Expo dont le receipt n'a pas encore été vérifié. */
async function selectPendingReceipts(admin: SupabaseClient): Promise<PendingReceiptRow[]> {
    const { data, error } = await admin
        .from('notification_sends')
        .select('id, ticket_ids')
        .eq('status', 'sent')
        .is('receipt_checked_at', null)
        .lt('created_at', new Date(Date.now() - RECEIPT_DELAY_MS).toISOString());
    if (error) {
        throw new Error(`select receipts en attente: ${error.message}`);
    }
    return (data ?? []) as PendingReceiptRow[];
}

async function selectTargets<Row>(
    admin: SupabaseClient,
    rpc: 'notify_reminder_targets' | 'notify_result_targets',
): Promise<Row[]> {
    const { data, error } = await admin.rpc(rpc);
    if (error) {
        throw new Error(`${rpc}: ${error.message}`);
    }
    return (data ?? []) as Row[];
}

/**
 * Vérifie les receipts des envois du tick précédent et purge les tokens morts.
 * Vérification unique par envoi : receipt absent (jamais arrivé) = assumé.
 */
async function processReceipts(
    admin: SupabaseClient,
    rows: PendingReceiptRow[],
    state: RunState,
): Promise<void> {
    if (rows.length === 0) {
        return;
    }
    try {
        const pairs = rows.flatMap((row) => row.ticket_ids ?? []);
        if (pairs.length > 0) {
            const receipts = await checkReceipts(pairs.map((pair) => pair.id));
            await pruneTokens(admin, unregisteredTokensFromReceipts(pairs, receipts), state);
        }
        const { error } = await admin
            .from('notification_sends')
            .update({ receipt_checked_at: new Date().toISOString() })
            .in(
                'id',
                rows.map((row) => row.id),
            );
        if (error) {
            throw new Error(`update receipt_checked_at: ${error.message}`);
        }
        state.receiptsChecked = rows.length;
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error('notify: receipts failed', message);
        state.errors.push(`receipts: ${message}`);
    }
}

/**
 * Claim puis envoi d'un type de notification. Les groupes non claimés (déjà
 * notifiés par un tick concurrent) sont ignorés sans erreur.
 */
async function processTargets<Row extends { user_id: string; match_id: string; token: string }>(
    admin: SupabaseClient,
    type: SendType,
    groups: TargetGroup<Row>[],
    state: RunState,
): Promise<void> {
    if (groups.length === 0) {
        return;
    }
    try {
        const { data: claims, error: claimError } = await admin
            .from('notification_sends')
            .upsert(
                groups.map((group) => ({
                    user_id: group.userId,
                    match_id: group.matchId,
                    type,
                })),
                { onConflict: 'user_id,match_id,type', ignoreDuplicates: true },
            )
            .select('id, user_id, match_id');
        if (claimError) {
            throw new Error(`claim ${type}: ${claimError.message}`);
        }
        const claimIdByKey = new Map(
            (claims ?? []).map((claim) => [`${claim.user_id}:${claim.match_id}`, claim.id]),
        );
        const claimedGroups = groups.filter((group) =>
            claimIdByKey.has(`${group.userId}:${group.matchId}`),
        );
        if (claimedGroups.length === 0) {
            return;
        }

        // Un message par token, avec en parallèle l'id du claim de chaque message
        const messages: ExpoPushMessage[] = [];
        const sendIds: string[] = [];
        for (const group of claimedGroups) {
            const groupMessages =
                type === 'reminder'
                    ? reminderMessages(group as unknown as TargetGroup<ReminderTargetRow>)
                    : resultMessages(group as unknown as TargetGroup<ResultTargetRow>);
            const sendId = claimIdByKey.get(`${group.userId}:${group.matchId}`)!;
            for (const message of groupMessages) {
                messages.push(message);
                sendIds.push(sendId);
            }
        }

        let tickets: Awaited<ReturnType<typeof sendPushMessages>>;
        try {
            tickets = await sendPushMessages(messages);
        } catch (error) {
            // Échec HTTP global : les claims restent posés (pas de re-tentative,
            // perte assumée plutôt que double envoi) — marqués en erreur.
            const message = error instanceof Error ? error.message : String(error);
            await admin
                .from('notification_sends')
                .update({ status: 'error' })
                .in('id', [...claimIdByKey.values()]);
            throw new Error(`envoi ${type}: ${message}`);
        }

        const outcome = analyzeTickets(messages, tickets);
        await pruneTokens(admin, outcome.unregisteredTokens, state);
        state.errors.push(...outcome.errors.map((error) => `${type}: ${error}`));

        // Statut par claim : sent si au moins un ticket accepté, error sinon
        const pairsBySend = new Map<string, TicketPair[]>();
        for (const pair of outcome.pairs) {
            const sendId = sendIds[pair.index];
            const pairs = pairsBySend.get(sendId) ?? [];
            pairs.push({ id: pair.id, token: pair.token });
            pairsBySend.set(sendId, pairs);
        }
        for (const [key, sendId] of claimIdByKey) {
            const pairs = pairsBySend.get(sendId);
            const { error } = await admin
                .from('notification_sends')
                .update(pairs ? { status: 'sent', ticket_ids: pairs } : { status: 'error' })
                .eq('id', sendId);
            if (error) {
                state.errors.push(`update send ${key}: ${error.message}`);
                continue;
            }
            if (pairs) {
                if (type === 'reminder') {
                    state.remindersSent += 1;
                } else {
                    state.resultsSent += 1;
                }
            }
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`notify: ${type} failed`, message);
        state.errors.push(message);
    }
}

/** Supprime les tokens morts — plus jamais ciblés dès le prochain scan. */
async function pruneTokens(
    admin: SupabaseClient,
    tokens: string[],
    state: RunState,
): Promise<void> {
    if (tokens.length === 0) {
        return;
    }
    const unique = [...new Set(tokens)];
    const { error } = await admin.from('push_tokens').delete().in('token', unique);
    if (error) {
        state.errors.push(`prune tokens: ${error.message}`);
        return;
    }
    state.tokensPruned += unique.length;
}

async function finishRun(
    admin: SupabaseClient,
    runId: string,
    status: 'success' | 'error',
    state: RunState,
): Promise<void> {
    const { error } = await admin
        .from('job_runs')
        .update({
            status,
            finished_at: new Date().toISOString(),
            detail: {
                reminders_sent: state.remindersSent,
                results_sent: state.resultsSent,
                tokens_pruned: state.tokensPruned,
                receipts_checked: state.receiptsChecked,
                ...(state.errors.length > 0 ? { errors: state.errors } : {}),
            },
        })
        .eq('id', runId);
    if (error) {
        console.error('notify: job_runs update failed', error.message);
    }
}

function json(body: Record<string, unknown>, status: number): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });
}
