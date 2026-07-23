import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

import { parseOAuthCallback } from '@/features/auth/parse-oauth-callback';
import type { OAuthProviderId } from '@/features/auth/providers';
import { supabase } from '@/lib/supabase';

/**
 * Chemin de retour du navigateur vers l'app. L'URL complète est construite par
 * `expo-linking` depuis le schéma déclaré dans `app.json` (`trycast://`), et doit
 * figurer dans l'allow-list « Redirect URLs » du projet Supabase.
 */
const CALLBACK_PATH = '/auth/callback';

/**
 * Parcours OAuth par navigateur système : c'est la mécanique des fournisseurs
 * qui n'offrent pas de feuille native sur la plateforme courante — Apple sur
 * Android, le jour où son Services ID existera.
 *
 * **Aucun fournisseur ne la déclare aujourd'hui** (cf. `providers.ts`). Elle est
 * écrite maintenant parce que le morceau réellement piégeux — la lecture de
 * l'URL de retour — est isolé dans `parse-oauth-callback.ts` et testé, et parce
 * que redécouvrir ce parcours dans six mois coûterait plus cher.
 *
 * `openAuthSessionAsync` s'appuie sur les Custom Tabs (Android) et
 * `ASWebAuthenticationSession` (iOS) : Google et Apple refusent l'authentification
 * depuis une WebView embarquée, une simple `Linking.openURL` ne conviendrait pas.
 */
export async function signInWithWebRedirect(
    provider: OAuthProviderId,
): Promise<'success' | 'cancelled'> {
    const redirectTo = Linking.createURL(CALLBACK_PATH);

    const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo, skipBrowserRedirect: true },
    });
    if (error) throw error;

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (result.type !== 'success') {
        return 'cancelled';
    }

    const callback = parseOAuthCallback(result.url);
    if (callback.type === 'error') {
        throw new Error(`OAuth ${provider} : ${callback.description}`);
    }

    const { error: sessionError } = await supabase.auth.setSession({
        access_token: callback.accessToken,
        refresh_token: callback.refreshToken,
    });
    if (sessionError) throw sessionError;

    return 'success';
}
