/**
 * Les push remote exigent un appareil physique et un build natif : Expo Go
 * (executionEnvironment 'storeClient') ne les supporte plus depuis SDK 53 et
 * getExpoPushTokenAsync y jette. Ce prédicat court-circuite tout appel push
 * dans ces environnements (simulateur, Expo Go, web) — l'app reste
 * fonctionnelle, seul l'enregistrement du token est sauté.
 */
export function isPushSupported(params: {
    isDevice: boolean;
    executionEnvironment: string;
    platform: string;
}): boolean {
    return (
        params.isDevice &&
        params.executionEnvironment !== 'storeClient' &&
        (params.platform === 'android' || params.platform === 'ios')
    );
}
