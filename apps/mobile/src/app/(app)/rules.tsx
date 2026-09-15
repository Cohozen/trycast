import {
    EyeOff,
    LockKeyhole,
    MoveHorizontal,
    Shield,
    Target,
    Trophy,
    Users,
    Zap,
} from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import { Screen } from '@/components/ui/screen';
import { SectionLabel } from '@/components/ui/section-label';
import { RuleCard } from '@/features/scoring/components/rule-card';
import { useActiveScoringRules } from '@/features/scoring/use-active-scoring-rules';
import { Text, useThemeColor, View } from '@/tw';

/**
 * Référentiel des règles du jeu : barème de scoring (valeurs vivantes lues via
 * useActiveScoringRules — la table scoring_rules fait foi, aucun chiffre en dur
 * dans les traductions) + règles générales (deadline, pronos masqués, ligues).
 * Titre et retour portés par le header natif (déclaré dans le layout (app)).
 */
export default function RulesScreen() {
    const { t, i18n } = useTranslation(['scoring', 'common']);
    const rules = useActiveScoringRules();
    const brandColor = useThemeColor('brand');

    const fmt = new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 1 });
    const iconProps = { color: brandColor, size: 17, strokeWidth: 1.9 } as const;

    return (
        <Screen contentClassName="gap-[22px] px-[18px] pb-10 pt-4" top="none">
            <Text className="px-1.5 font-body text-[13px] leading-[19px] text-text-muted">
                {t('scoring:rules.intro')}
            </Text>

            {/* Le barème, volet par volet */}
            <View className="gap-2.5">
                <SectionLabel>{t('scoring:rules.sections.bareme')}</SectionLabel>
                <RuleCard
                    description={t('scoring:rules.bareme.winner.description', {
                        factor: rules.winnerPointsPerOddsUnit,
                    })}
                    icon={<Trophy {...iconProps} />}
                    note={t('scoring:rules.bareme.winner.fallback', {
                        odds: fmt.format(rules.fallbackOdds),
                    })}
                    title={t('scoring:rules.bareme.winner.title')}
                    value={t('scoring:rules.bareme.winner.value', {
                        factor: rules.winnerPointsPerOddsUnit,
                    })}
                />
                <RuleCard
                    description={t('scoring:rules.bareme.exactScore.description')}
                    icon={<Target {...iconProps} />}
                    title={t('scoring:rules.bareme.exactScore.title')}
                    value={t('scoring:rules.bareme.exactScore.value', {
                        points: rules.exactScoreBonus,
                    })}
                />
                <RuleCard
                    description={t('scoring:rules.bareme.gap.description', {
                        exact: rules.exactGapBonus,
                        close: rules.closeGapBonus,
                        tolerance: rules.closeGapTolerance,
                    })}
                    icon={<MoveHorizontal {...iconProps} />}
                    title={t('scoring:rules.bareme.gap.title')}
                    value={t('scoring:rules.bareme.gap.value', { exact: rules.exactGapBonus })}
                />
                <RuleCard
                    description={t('scoring:rules.bareme.defensive.description', {
                        gap: rules.defensiveBonusMaxGap,
                    })}
                    icon={<Shield {...iconProps} />}
                    title={t('scoring:rules.bareme.defensive.title')}
                    value={t('scoring:rules.bareme.defensive.value', {
                        points: rules.defensiveBonusPoints,
                    })}
                />
                <RuleCard
                    description={t('scoring:rules.bareme.offensive.description', {
                        tries: rules.offensiveBonusMinTries,
                        percent: fmt.format(rules.offensiveBonusRatio * 100),
                        factor: rules.winnerPointsPerOddsUnit,
                        malus: rules.offensiveMalusPoints,
                    })}
                    icon={<Zap {...iconProps} />}
                    note={t('scoring:rules.bareme.offensive.note')}
                    title={t('scoring:rules.bareme.offensive.title')}
                    value={t('scoring:rules.bareme.offensive.value', {
                        percent: fmt.format(rules.offensiveBonusRatio * 100),
                    })}
                />
                <Text className="px-1.5 text-center font-body text-[12px] text-text-faint">
                    {t('scoring:rules.bareme.floor')}
                </Text>
            </View>

            {/* Règles générales */}
            <View className="gap-2.5">
                <SectionLabel>{t('scoring:rules.sections.general')}</SectionLabel>
                <RuleCard
                    description={t('scoring:rules.general.deadline.description')}
                    icon={<LockKeyhole {...iconProps} />}
                    title={t('scoring:rules.general.deadline.title')}
                />
                <RuleCard
                    description={t('scoring:rules.general.masked.description')}
                    icon={<EyeOff {...iconProps} />}
                    title={t('scoring:rules.general.masked.title')}
                />
                <RuleCard
                    description={t('scoring:rules.general.leagues.description')}
                    icon={<Users {...iconProps} />}
                    title={t('scoring:rules.general.leagues.title')}
                />
            </View>
        </Screen>
    );
}
