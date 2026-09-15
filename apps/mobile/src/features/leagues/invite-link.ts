import { normalizeInviteCode } from './validation';

/**
 * Segment de chemin des liens d'invitation, côté site comme côté natif.
 *
 * Il doit rester identique à trois autres endroits : `buildInviteUrl`
 * (`src/lib/urls.ts`), le rewrite de `web/vercel.json`, et le `pathPrefix` des
 * liens d'application déclarés dans `app.json`.
 */
export const INVITE_PATH_SEGMENT = 'rejoindre';

/**
 * Extrait le code d'invitation d'un lien entrant, ou null si ce lien n'en est
 * pas un — auquel cas l'appelant laisse passer le chemin sans y toucher.
 *
 * Expo Router ne garantit pas que la valeur reçue par `redirectSystemPath`
 * soit une URL complète : elle est donc résolue contre une base arbitraire,
 * ce qui traite indifféremment `https://www.trycast.fr/rejoindre/<code>` et
 * un chemin nu `/rejoindre/<code>`. L'hôte n'est volontairement pas filtré :
 * c'est le système qui décide quels domaines nous parviennent, à partir des
 * `.well-known/` servis par le site — le refaire ici n'ajouterait aucune
 * garantie, et casserait silencieusement le jour d'un changement de domaine.
 */
export function inviteCodeFromPath(path: string): string | null {
    let pathname: string;
    try {
        pathname = new URL(path, 'trycast://link').pathname;
    } catch {
        return null;
    }
    const segments = pathname.split('/').filter(Boolean);
    if (segments.length !== 2 || segments[0] !== INVITE_PATH_SEGMENT) return null;
    try {
        return normalizeInviteCode(decodeURIComponent(segments[1]));
    } catch {
        // Séquence d'échappement invalide : ce n'est pas un code.
        return null;
    }
}
