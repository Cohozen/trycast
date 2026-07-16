import { Check, TriangleAlert, Users } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { LeagueIcon } from '@/features/leagues/components/league-icon';
import type { LeaguePreview } from '@/features/leagues/types';
import { Pressable, Text, useThemeColor, View } from '@/tw';

type LeaguePreviewSheetProps = {
    visible: boolean;
    /** Aperçu résolu par preview_league ; null tant que la RPC n'a pas répondu. */
    preview: LeaguePreview | null;
    joining: boolean;
    onJoin: () => void;
    /** Déjà membre : ouvrir directement le détail de la ligue. */
    onOpen: () => void;
    onCancel: () => void;
};

/**
 * Sheet d'aperçu avant adhésion (maquette Rejoindre) : identité de la ligue
 * résolue par code, et un CTA qui s'adapte — rejoindre, ouvrir si déjà
 * membre, désactivé si la ligue est pleine. Rien n'est validé tant que
 * l'utilisateur n'a pas confirmé ici.
 */
export function LeaguePreviewSheet({
    visible,
    preview,
    joining,
    onJoin,
    onOpen,
    onCancel,
}: LeaguePreviewSheetProps) {
    const { t } = useTranslation(['leagues', 'common']);
    const insets = useSafeAreaInsets();
    const brandColor = useThemeColor('brand');
    const warningColor = useThemeColor('warning');
    const mutedColor = useThemeColor('text-muted');

    if (!preview) return null;

    return (
        <Modal animationType="slide" onRequestClose={onCancel} transparent visible={visible}>
            <View className="flex-1 justify-end">
                <Pressable
                    accessibilityLabel={t('common:actions.cancel')}
                    className="absolute inset-0 bg-[#0B1A11]/50"
                    onPress={onCancel}
                />
                <View
                    className="gap-4 rounded-t-lg bg-surface px-5 pt-3 tc-shadow-lg"
                    style={{ paddingBottom: Math.max(insets.bottom, 16) + 8 }}>
                    <View className="h-1 w-10 self-center rounded-pill bg-border-strong" />

                    <View className="flex-row items-center gap-4">
                        <LeagueIcon color={preview.color} name={preview.name} />
                        <View className="min-w-0 flex-1 gap-1">
                            <Text
                                className="font-display text-[26px] leading-[28px] text-text"
                                numberOfLines={1}>
                                {preview.name}
                            </Text>
                            <View className="flex-row flex-wrap items-center gap-2">
                                <View className="flex-row items-center gap-1">
                                    <Users color={mutedColor} size={13} strokeWidth={2} />
                                    <Text className="font-body-semibold text-[12.5px] text-text-muted">
                                        {t('leagues:detail.members', {
                                            count: preview.member_count,
                                        })}
                                    </Text>
                                </View>
                                <View className="h-[3px] w-[3px] rounded-pill bg-text-faint" />
                                <Text className="font-body-semibold text-[12.5px] text-text-faint">
                                    {t('leagues:join.preview.meta', {
                                        competition: preview.competition_name,
                                    })}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {preview.is_member ? (
                        <View className="flex-row items-start gap-2.5 rounded-sm border border-brand/30 bg-brand/10 px-3.5 py-3">
                            <Check color={brandColor} size={17} strokeWidth={2} />
                            <Text className="flex-1 font-body text-[13px] leading-[19px] text-text">
                                {t('leagues:join.preview.alreadyMember')}
                            </Text>
                        </View>
                    ) : preview.is_full ? (
                        <View className="flex-row items-start gap-2.5 rounded-sm border border-warning/35 bg-warning/15 px-3.5 py-3">
                            <TriangleAlert color={warningColor} size={17} strokeWidth={2} />
                            <Text className="flex-1 font-body text-[13px] leading-[19px] text-text">
                                {t('leagues:join.preview.fullNote', {
                                    count: preview.member_count,
                                })}
                            </Text>
                        </View>
                    ) : null}

                    <View className="gap-2.5">
                        {preview.is_member ? (
                            <Button
                                fullWidth
                                onPress={onOpen}
                                title={t('leagues:join.preview.open')}
                                variant="secondary"
                            />
                        ) : (
                            <Button
                                disabled={preview.is_full}
                                fullWidth
                                loading={joining}
                                onPress={onJoin}
                                title={
                                    preview.is_full
                                        ? t('leagues:join.preview.full')
                                        : t('leagues:join.preview.join')
                                }
                            />
                        )}
                        <Button
                            disabled={joining}
                            fullWidth
                            onPress={onCancel}
                            title={t('common:actions.cancel')}
                            variant="ghost"
                        />
                    </View>
                </View>
            </View>
        </Modal>
    );
}
