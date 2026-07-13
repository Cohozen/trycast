// Suppression de compte (exigence Apple) : vérifie le JWT de l'appelant puis
// supprime l'utilisateur auth.users via la service_role key. Le ON DELETE CASCADE
// de profiles (et des futures tables user_id) nettoie le reste ; le Storage
// n'est pas couvert par la cascade → on purge le dossier avatar à la main.
import { createClient } from 'jsr:@supabase/supabase-js@2';

const AVATARS_BUCKET = 'avatars';

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

    // Purge du dossier avatar (best-effort : ne bloque pas la suppression du
    // compte si le Storage est vide ou indisponible).
    const { data: avatarFiles } = await admin.storage.from(AVATARS_BUCKET).list(user.id);
    if (avatarFiles && avatarFiles.length > 0) {
        const paths = avatarFiles.map((file) => `${user.id}/${file.name}`);
        const { error: storageError } = await admin.storage.from(AVATARS_BUCKET).remove(paths);
        if (storageError) {
            console.error('delete-account avatar purge failed', {
                userId: user.id,
                error: storageError.message,
            });
        }
    }

    const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
    if (deleteError) {
        console.error('delete-account failed', { userId: user.id, error: deleteError.message });
        return json({ error: 'delete_failed' }, 500);
    }

    return json({ success: true }, 200);
});

function json(body: Record<string, unknown>, status: number): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });
}
