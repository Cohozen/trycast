import { describe, expect, it } from 'vitest';

import appJson from '../../app.json';
import packageJson from '../../package.json';

/**
 * `app.json` → `expo.version` est la seule source de vérité de la version
 * affichée (Réglages, stores) ; `package.json` la duplique par convention npm.
 * Ce test casse la CI si l'une est bumpée sans l'autre — la dérive entre les
 * deux est précisément ce qu'on ne veut pas découvrir au moment d'une release.
 * Le numéro de build (versionCode / buildNumber) n'est pas concerné : il est
 * géré par EAS (`appVersionSource: "remote"` + `autoIncrement`).
 */
describe('version de l’app', () => {
    it('est identique dans app.json et package.json', () => {
        expect(appJson.expo.version).toBe(packageJson.version);
    });

    it('respecte le format semver MAJOR.MINOR.PATCH', () => {
        expect(appJson.expo.version).toMatch(/^\d+\.\d+\.\d+$/);
    });
});
