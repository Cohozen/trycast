import { type ReactElement, useCallback, useEffect, useRef, useState } from 'react';
import { Platform, RefreshControl, type RefreshControlProps } from 'react-native';

import { useThemeColor } from '@/tw';

/**
 * Geste « tirer pour rafraîchir » du design system : renvoie un
 * `RefreshControl` prêt à passer en prop `refreshControl` d'un `ScrollView`
 * (ou du wrapper `Screen`, qui relaie la prop).
 *
 * L'état `refreshing` est local (pas dérivé de `isFetching` des queries) pour
 * que le spinner ne s'affiche qu'au geste manuel, et jamais pendant un polling
 * de fond (ex. cadence live à 60 s). `refetch` est capturé par ref : le
 * callback interne reste stable même si l'appelant recrée sa fonction à chaque
 * rendu.
 *
 * `topOffset` : hauteur d'une barre transparente posée par-dessus le contenu
 * (header en verre) — le spinner Android se cale dessous au lieu d'y
 * disparaître.
 */
export function usePullToRefresh(
    refetch: () => Promise<unknown>,
    topOffset?: number,
): ReactElement<RefreshControlProps> {
    const [refreshing, setRefreshing] = useState(false);
    const refetchRef = useRef(refetch);
    useEffect(() => {
        refetchRef.current = refetch;
    });

    const accent = useThemeColor('accent');
    const surface = useThemeColor('surface');

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        try {
            await refetchRef.current();
        } finally {
            setRefreshing(false);
        }
    }, []);

    return (
        <RefreshControl
            colors={Platform.OS === 'android' ? [accent] : undefined}
            onRefresh={onRefresh}
            progressBackgroundColor={Platform.OS === 'android' ? surface : undefined}
            progressViewOffset={topOffset}
            refreshing={refreshing}
            tintColor={accent}
        />
    );
}
