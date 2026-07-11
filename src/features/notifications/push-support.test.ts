import { describe, expect, it } from 'vitest';
import { isPushSupported } from './push-support';

const onDevice = { isDevice: true, executionEnvironment: 'standalone', platform: 'android' };

describe('isPushSupported', () => {
    it('accepte un build natif sur appareil physique', () => {
        expect(isPushSupported(onDevice)).toBe(true);
        expect(isPushSupported({ ...onDevice, platform: 'ios' })).toBe(true);
        expect(isPushSupported({ ...onDevice, executionEnvironment: 'bare' })).toBe(true);
    });

    it('refuse Expo Go (les push y sont retirés depuis SDK 53)', () => {
        expect(isPushSupported({ ...onDevice, executionEnvironment: 'storeClient' })).toBe(false);
    });

    it('refuse simulateur et web', () => {
        expect(isPushSupported({ ...onDevice, isDevice: false })).toBe(false);
        expect(isPushSupported({ ...onDevice, platform: 'web' })).toBe(false);
    });
});
