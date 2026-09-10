import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import {
    changelogAvecSection,
    comparerVersions,
    grouperCommits,
    incrementer,
    lireNotes,
    remplacerVersion,
    resoudreCible,
    sectionChangelog,
} from './release.mjs';

/**
 * `scripts/release.mjs` écrit dans le dépôt et parle au réseau : seules ses
 * fonctions pures sont testables ici. Ce sont aussi les seules dont une erreur
 * serait silencieuse — un remplacement de version qui rate laisse un dépôt
 * incohérent que rien ne signale avant le build suivant.
 */

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..');

describe('incrementer', () => {
    it('remet à zéro les rangs inférieurs', () => {
        expect(incrementer('1.2.3', 'patch')).toBe('1.2.4');
        expect(incrementer('1.2.3', 'minor')).toBe('1.3.0');
        expect(incrementer('1.2.3', 'major')).toBe('2.0.0');
    });

    it('refuse une version hors semver', () => {
        expect(() => incrementer('1.2', 'patch')).toThrow();
        expect(() => incrementer('1.2.3-rc.1', 'patch')).toThrow();
    });
});

describe('comparerVersions', () => {
    it('ordonne par rang, pas lexicographiquement', () => {
        expect(comparerVersions('1.10.0', '1.9.0')).toBe(1);
        expect(comparerVersions('1.0.0', '1.0.0')).toBe(0);
        expect(comparerVersions('0.9.9', '1.0.0')).toBe(-1);
    });
});

describe('resoudreCible', () => {
    it('accepte exactement un type de bump', () => {
        expect(resoudreCible('1.0.0', ['--minor'])).toEqual({ type: 'minor', cible: '1.1.0' });
        expect(resoudreCible('1.0.0', ['--version=2.5.1'])).toEqual({
            type: 'version',
            cible: '2.5.1',
        });
    });

    it('refuse un appel ambigu ou vide', () => {
        expect(() => resoudreCible('1.0.0', [])).toThrow(/manquant ou ambigu/);
        expect(() => resoudreCible('1.0.0', ['--minor', '--patch'])).toThrow(/ambigu/);
        expect(() => resoudreCible('1.0.0', ['--minor', '--version=1.1.0'])).toThrow(/ambigu/);
    });

    it('refuse une version qui recule, accepte la version inchangée', () => {
        expect(() => resoudreCible('1.2.0', ['--version=1.1.9'])).toThrow(/antérieure/);
        // Taguer l'état courant sans bump : c'est le cas de la première release.
        expect(resoudreCible('1.0.0', ['--version=1.0.0']).cible).toBe('1.0.0');
    });

    it('refuse une pré-version', () => {
        expect(() => resoudreCible('1.0.0', ['--version=1.1.0-rc.1'])).toThrow(/semver/);
    });
});

describe('lireNotes', () => {
    it('accepte les deux formes et la répétition', () => {
        expect(lireNotes(['--notes', 'Une chose', '--notes=Une autre'])).toEqual([
            'Une chose',
            'Une autre',
        ]);
    });

    it('découpe une valeur multiligne en puces et retire les tirets', () => {
        expect(lireNotes(['--notes', 'Première\n- Deuxième\n\n* Troisième'])).toEqual([
            'Première',
            'Deuxième',
            'Troisième',
        ]);
    });

    it('ignore un drapeau collé à la place de la valeur', () => {
        expect(lireNotes(['--notes', '--dry-run'])).toEqual([]);
        expect(lireNotes(['--minor', '--dry-run'])).toEqual([]);
    });
});

describe('remplacerVersion', () => {
    it("remplace l'unique occurrence sans toucher au reste du fichier", () => {
        const avant = '{\n    "name": "trycast",\n    "version": "1.0.0",\n    "x": 1\n}\n';
        const apres = remplacerVersion(avant, '1.0.0', '1.1.0', 'package.json');
        expect(apres).toBe('{\n    "name": "trycast",\n    "version": "1.1.0",\n    "x": 1\n}\n');
    });

    it('refuse plutôt que de deviner si le compte n’est pas exactement 1', () => {
        expect(() => remplacerVersion('{}', '1.0.0', '1.1.0', 'app.json')).toThrow(/0 fois/);
        const deux = '"version": "1.0.0"\n"version": "1.0.0"';
        expect(() => remplacerVersion(deux, '1.0.0', '1.1.0', 'app.json')).toThrow(/2 fois/);
    });

    it('opère sur les vrais fichiers du dépôt, une seule fois chacun', () => {
        // C'est l'hypothèse qui rendrait le script dangereux si elle tombait :
        // on la vérifie sur les fichiers réels, pas sur une fixture.
        const actuelle = JSON.parse(readFileSync(join(RACINE, 'app.json'), 'utf8')).expo.version;
        for (const fichier of ['app.json', 'package.json']) {
            const contenu = readFileSync(join(RACINE, fichier), 'utf8');
            const apres = remplacerVersion(contenu, actuelle, '9.9.9', fichier);
            expect(apres).not.toBe(contenu);
            expect(JSON.parse(apres).expo?.version ?? JSON.parse(apres).version).toBe('9.9.9');
        }
    });
});

describe('changelogAvecSection', () => {
    const section = sectionChangelog('1.1.0', ['Une nouveauté'], '2026-09-10');

    it('crée le fichier avec son en-tête quand il est absent', () => {
        const resultat = changelogAvecSection(null, section);
        expect(resultat).toMatch(/^# Journal des modifications/);
        expect(resultat).toContain('## 1.1.0 — 2026-09-10');
        expect(resultat).toContain('- Une nouveauté');
    });

    it('insère la nouvelle section avant les précédentes', () => {
        const existant = '# Journal\n\nPréambule.\n\n## 1.0.0 — 2026-09-03\n\n- Première version\n';
        const resultat = changelogAvecSection(existant, section);
        expect(resultat.indexOf('## 1.1.0')).toBeLessThan(resultat.indexOf('## 1.0.0'));
        expect(resultat).toContain('Préambule.');
        expect(resultat).toContain('- Première version');
    });

    it('ajoute à la fin quand le fichier ne contient aucune section', () => {
        const resultat = changelogAvecSection('# Journal\n\nPréambule.\n', section);
        expect(resultat).toContain('Préambule.');
        expect(resultat.trimEnd()).toMatch(/- Une nouveauté$/);
    });
});

describe('grouperCommits', () => {
    it('range par préfixe conventionnel et retire le préfixe du sujet', () => {
        const groupes = grouperCommits([
            'feat: partage par lien',
            'fix(web): empreinte mal formée',
            'sans préfixe du tout',
        ]);
        expect(groupes.get('feat')).toEqual(['partage par lien']);
        expect(groupes.get('fix')).toEqual(['empreinte mal formée']);
        expect(groupes.get('autres')).toEqual(['sans préfixe du tout']);
    });
});
