// Notifications push (Lot 6) : rappels de prono à H-1, résultats après la
// passe 1 du scoring et coup de la journée (v1.1.0) quand une journée se
// solde avec un coup dans une ligue. Appelée par pg_cron toutes les 10 minutes (décalée de
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
    type RoundHighlightRpcRow,
    type RoundHighlightTargetRow,
    roundHighlightMessages,
    sendKey,
    type TargetGroup,
    toRoundHighlightTargets,
} from './transform.ts';

// Les receipts Expo sont disponibles ~15 min après l'envoi
const RECEIPT_DELAY_MS = 15 * 60 * 1000;

type SendType = 'reminder' | 'result' | 'round_highlight';

type PendingReceiptRow = { id: string; ticket_ids: TicketPair[] | null };

/** Contenu recopié dans notification_sends pour l'écran Notifications de l'app. */
type InboxContent = { title: string; body: string; url: string };

type RunState = {
    remindersSent: number;
    resultsSent: number;
    roundHighlightsSent: number;
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

    const [pendingReceipts, reminderRows, resultRows, highlightRows] = await Promise.all([
        selectPendingReceipts(admin),
        selectTargets<ReminderTargetRow>(admin, 'notify_reminder_targets'),
        selectTargets<ResultTargetRow>(admin, 'notify_result_targets'),
        selectTargets<RoundHighlightRpcRow>(admin, 'notify_round_highlight_targets'),
    ]);
    if (
        pendingReceipts.length === 0 &&
        reminderRows.length === 0 &&
        resultRows.length === 0 &&
        highlightRows.length === 0
    ) {
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
        roundHighlightsSent: 0,
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
        await processTargets(
            admin,
            'round_highlight',
            groupTargets(toRoundHighlightTargets(highlightRows)),
            state,
        );

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
    rpc: 'notify_reminder_targets' | 'notify_result_targets' | 'notify_round_highlight_targets',
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
                    league_id: group.leagueId,
                })),
                // Unicité « nulls not distinct » : league_id null pour rappels
                // et résultats (migration 20260922000100_round_highlights.sql)
                { onConflict: 'user_id,match_id,type,league_id', ignoreDuplicates: true },
            )
            .select('id, user_id, match_id, league_id');
        if (claimError) {
            throw new Error(`claim ${type}: ${claimError.message}`);
        }
        const claimIdByKey = new Map(
            (claims ?? []).map((claim) => [
                sendKey(claim.user_id, claim.match_id, claim.league_id),
                claim.id,
            ]),
        );
        const claimedGroups = groups.filter((group) =>
            claimIdByKey.has(sendKey(group.userId, group.matchId, group.leagueId)),
        );
        if (claimedGroups.length === 0) {
            return;
        }

        // Badge d'icône (iOS) : non-lues déjà en boîte + celles de ce tick. Les
        // lignes qu'on vient de claimer n'ont pas encore de title, donc ne sont
        // pas comptées par la RPC — d'où l'incrément manuel groupe par groupe
        // (un user peut recevoir deux notifications dans le même tick).
        const unreadByUser = await selectUnreadCounts(
            admin,
            claimedGroups.map((group) => group.userId),
        );

        // Un message par token, avec en parallèle l'id du claim de chaque message
        const messages: ExpoPushMessage[] = [];
        const sendIds: string[] = [];
        // Contenu envoyé, par claim : recopié en base pour la boîte de réception
        const contentBySend = new Map<string, InboxContent>();
        for (const group of claimedGroups) {
            const sendId = claimIdByKey.get(sendKey(group.userId, group.matchId, group.leagueId))!;
            const badge = (unreadByUser.get(group.userId) ?? 0) + 1;
            unreadByUser.set(group.userId, badge);
            const context = { sendId, badge };
            const groupMessages =
                type === 'reminder'
                    ? reminderMessages(group as unknown as TargetGroup<ReminderTargetRow>, context)
                    : type === 'result'
                      ? resultMessages(group as unknown as TargetGroup<ResultTargetRow>, context)
                      : roundHighlightMessages(
                            group as unknown as TargetGroup<RoundHighlightTargetRow>,
                            context,
                        );
            // Contenu identique dans un groupe (un groupe = un user = une locale)
            const [first] = groupMessages;
            if (first) {
                contentBySend.set(sendId, {
                    title: first.title,
                    body: first.body,
                    url: String(first.data?.url ?? ''),
                });
            }
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
            // Le contenu n'est recopié qu'avec le statut 'sent' : une ligne sans
            // title n'entre jamais dans la boîte de réception (cf. migration
            // 20260725000100_notifications_inbox.sql).
            const { error } = await admin
                .from('notification_sends')
                .update(
                    pairs
                        ? { status: 'sent', ticket_ids: pairs, ...contentBySend.get(sendId) }
                        : { status: 'error' },
                )
                .eq('id', sendId);
            if (error) {
                state.errors.push(`update send ${key}: ${error.message}`);
                continue;
            }
            if (pairs) {
                if (type === 'reminder') {
                    state.remindersSent += 1;
                } else if (type === 'result') {
                    state.resultsSent += 1;
                } else {
                    state.roundHighlightsSent += 1;
                }
            }
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`notify: ${type} failed`, message);
        state.errors.push(message);
    }
}

/**
 * Non-lues déjà en boîte de réception, par user. Un échec ne doit pas empêcher
 * l'envoi : le badge repart alors de zéro, l'app le resynchronisera à la
 * prochaine ouverture de l'écran Notifications.
 */
async function selectUnreadCounts(
    admin: SupabaseClient,
    userIds: string[],
): Promise<Map<string, number>> {
    const unique = [...new Set(userIds)];
    if (unique.length === 0) {
        return new Map();
    }
    const { data, error } = await admin.rpc('notify_unread_counts', { p_user_ids: unique });
    if (error) {
        console.error('notify: notify_unread_counts failed', error.message);
        return new Map();
    }
    return new Map(
        ((data ?? []) as { user_id: string; unread: number }[]).map((row) => [
            row.user_id,
            row.unread,
        ]),
    );
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
                round_highlights_sent: state.roundHighlightsSent,
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
