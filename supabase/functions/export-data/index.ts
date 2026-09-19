// Export des données personnelles (RGPD) : vérifie le JWT de l'appelant puis
// agrège, via la service_role key, toutes les données rattachées à son compte.
// Renvoie un JSON que l'app partage (aucun envoi d'e-mail côté serveur). Même
// schéma d'auth que delete-account : Bearer JWT → getUser → 401 sinon.
import { createClient } from 'jsr:@supabase/supabase-js@2';

Deno.serve(async (req: Request) => {
    if (req.method !== 'POST') {
        return json({ error: 'method_not_allowed' }, 405);
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
        return json({ error: 'unauthorized' }, 401);
    }

    const admin = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const token = authHeader.slice('Bearer '.length);
    const {
        data: { user },
        error: userError,
    } = await admin.auth.getUser(token);

    if (userError || !user) {
        return json({ error: 'unauthorized' }, 401);
    }

    const uid = user.id;

    // Chaque bloc est filtré sur l'utilisateur. Les jetons push sont un secret
    // d'appareil : on n'exporte que la plateforme et les dates, jamais la valeur.
    // Réactions reçues : sans l'auteur, qui est la donnée d'un autre membre.
    const [
        profile,
        predictions,
        jokers,
        reactionsGiven,
        reactionsReceived,
        memberships,
        ownedLeagues,
        standings,
        prefs,
        consents,
        devices,
    ] = await Promise.all([
        admin.from('profiles').select('*').eq('id', uid).maybeSingle(),
        admin.from('predictions').select('*').eq('user_id', uid),
        admin.from('phase_jokers').select('phase_id, match_id, updated_at').eq('user_id', uid),
        admin
            .from('prediction_reactions')
            .select('league_id, match_id, target_user_id, reaction, created_at, updated_at')
            .eq('reactor_id', uid),
        admin
            .from('prediction_reactions')
            .select('league_id, match_id, reaction, created_at')
            .eq('target_user_id', uid),
        admin.from('league_members').select('*').eq('user_id', uid),
        admin
            .from('leagues')
            .select('id, name, color, invite_code, created_at')
            .eq('owner_id', uid),
        admin.from('standings').select('*').eq('user_id', uid),
        admin.from('notification_prefs').select('*').eq('user_id', uid).maybeSingle(),
        admin
            .from('consents')
            .select('*')
            .eq('user_id', uid)
            .order('created_at', { ascending: true }),
        admin.from('push_tokens').select('platform, created_at, updated_at').eq('user_id', uid),
    ]);

    const payload = {
        exported_at: new Date().toISOString(),
        account: {
            id: user.id,
            email: user.email ?? null,
            created_at: user.created_at,
        },
        profile: profile.data ?? null,
        predictions: predictions.data ?? [],
        phase_jokers: jokers.data ?? [],
        reactions_given: reactionsGiven.data ?? [],
        reactions_received: reactionsReceived.data ?? [],
        league_memberships: memberships.data ?? [],
        owned_leagues: ownedLeagues.data ?? [],
        standings: standings.data ?? [],
        notification_preferences: prefs.data ?? null,
        consents: consents.data ?? [],
        push_devices: devices.data ?? [],
    };

    return json(payload, 200);
});

function json(body: Record<string, unknown>, status: number): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });
}
