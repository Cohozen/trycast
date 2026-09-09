import { inviteCodeFromPath } from '@/features/leagues/invite-link';
import { savePendingInvite } from '@/features/leagues/pending-invite-store';

/**
 * Traduit un lien entrant (App Link Android, Universal Link iOS) en route de
 * l'app. Seuls les liens d'invitation sont réécrits : tout le reste est rendu
 * tel quel, et le `pathPrefix` déclaré dans app.json fait que la landing et
 * les pages légales n'arrivent même pas jusqu'ici.
 *
 * Le code est **retenu au passage**, avant toute navigation, parce que la
 * redirection retournée ici n'est pas garantie d'aboutir : les trois
 * `<Stack.Protected>` de `_layout.tsx` renvoient vers `(auth)` un visiteur sans
 * session, et l'invitation serait perdue sans cette écriture. `usePendingInvite`
 * la rejoue après l'inscription, l'écran d'adhésion la purge quand le lien a
 * abouti du premier coup.
 */
export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
    try {
        const code = inviteCodeFromPath(path);
        if (!code) return path;
        void savePendingInvite(code);
        return `/league/new?tab=join&code=${code}`;
    } catch {
        // Un lien illisible ne doit jamais empêcher l'app de démarrer : on
        // rend la main à Expo Router, qui ouvrira l'accueil.
        return path;
    }
}
