import { describe, expect, it } from 'vitest';

import { BAREME_V2 } from '@/features/scoring/bareme';
import { createI18n } from '@/lib/create-i18n';

type I18n = ReturnType<typeof createI18n>;

const GAP = BAREME_V2.defensiveBonusMaxGap;

/**
 * Les libellés du barème (carte de prono, result-card, sheet de détail)
 * interpolent des valeurs vivantes du barème actif. Le typage i18next ne
 * vérifie que les CLÉS : oublier un paramètre passe `tsc` et affiche un
 * « {{gap}} » brut à l'écran. Ce test rend chaque libellé comme l'écran le
 * fait et refuse tout placeholder non résolu.
 */
const LABELS: { name: string; render: (i18n: I18n) => string; expected: string }[] = [
    {
        name: 'form.defensiveHint',
        render: (i18n) =>
            i18n.t('predictions:form.defensiveHint', {
                points: BAREME_V2.defensiveBonusPoints,
                gap: GAP,
            }),
        expected: String(GAP),
    },
    {
        name: 'breakdown.defensiveBadge',
        render: (i18n) => i18n.t('predictions:breakdown.defensiveBadge', { gap: GAP }),
        expected: String(GAP),
    },
    {
        name: 'breakdown.defensiveGap',
        render: (i18n) => i18n.t('predictions:breakdown.defensiveGap', { gap: GAP }),
        expected: String(GAP),
    },
    {
        name: 'breakdown.winner',
        render: (i18n) => i18n.t('predictions:breakdown.winner', { code: 'FRA', odds: '1,77' }),
        expected: '1,77',
    },
    {
        name: 'breakdown.winnerDraw',
        render: (i18n) => i18n.t('predictions:breakdown.winnerDraw', { odds: '1,77' }),
        expected: '1,77',
    },
];

describe('libellés du barème', () => {
    for (const lang of ['fr', 'en'] as const) {
        for (const { name, render, expected } of LABELS) {
            it(`${lang} — ${name} interpole ses valeurs`, () => {
                const rendered = render(createI18n(lang));
                expect(rendered).not.toMatch(/\{\{/);
                expect(rendered).toContain(expected);
            });
        }
    }
});
