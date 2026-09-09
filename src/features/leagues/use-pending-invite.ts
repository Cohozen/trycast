import { useRootNavigationState, usePathname, useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';

import { useWelcomeGuide } from '@/features/welcome/components/welcome-guide-provider';

import { takePendingInvite } from './pending-invite-store';

/**
 * Rattrape une invitation reçue par lien que la navigation n'a pas pu honorer
 * sur le moment — cas type : le lien est arrivé sans session, les
 * `<Stack.Protected>` ont renvoyé vers `(auth)`, et le code serait perdu sans
 * ça. Monté une fois dans `(app)`, il s'exécute donc au premier montage utile,
 * c'est-à-dire juste après l'inscription et le choix du pseudo.
 *
 * Trois gardes, chacune pour une raison distincte :
 * - `navigationReady` — même garde que le guide d'accueil et la célébration :
 *   ne pas naviguer pendant le splash ;
 * - `resolved` — ne pas ouvrir l'aperçu d'une ligue par-dessus la sheet de
 *   bienvenue, exactement le piège déjà connu pour la permission notifications ;
 * - `pathname` — quand le lien a abouti tout seul (session déjà ouverte,
 *   `+native-intent` a redirigé), l'écran d'adhésion est *déjà* à l'écran et
 *   purge le stockage lui-même. Cette garde rend l'ordre des deux effets
 *   indifférent, là où s'en remettre à leur ordonnancement serait fragile.
 */
export function usePendingInvite() {
    const router = useRouter();
    const pathname = usePathname();
    const navigationReady = !!useRootNavigationState()?.key;
    const { resolved } = useWelcomeGuide();
    // Une invitation ne se rejoue pas : la garde tombe avant même la lecture.
    const consumed = useRef(false);

    useEffect(() => {
        if (!navigationReady || !resolved || consumed.current) return;
        if (pathname.startsWith('/league/new')) return;
        consumed.current = true;
        void (async () => {
            const code = await takePendingInvite();
            if (!code) return;
            router.push({ pathname: '/league/new', params: { tab: 'join', code } });
        })();
    }, [navigationReady, pathname, resolved, router]);
}
