import { ArrowLeftRight, Check } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from 'react-native';

import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Pressable, ScrollView, Text, useThemeColor, View } from '@/tw';
import { cn } from '@/tw/variants';

export type TransferCandidate = {
    userId: string;
    username: string;
    avatarUrl: string | null;
};

type TransferOwnershipModalProps = {
    visible: boolean;
    /** Membres éligibles (tous sauf l'admin actuel). */
    candidates: TransferCandidate[];
    transferring: boolean;
    onConfirm: (userId: string) => void;
    onCancel: () => void;
};

/**
 * Transfert de propriété (maquette Détail Ligue, zone danger admin) : choisir
 * le nouveau propriétaire parmi les membres puis confirmer — le bouton reste
 * désarmé sans sélection. L'appelant devient simple membre (rappelé en note).
 */
export function TransferOwnershipModal({
    visible,
    candidates,
    transferring,
    onConfirm,
    onCancel,
}: TransferOwnershipModalProps) {
    const { t } = useTranslation(['leagues', 'common']);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const brandColor = useThemeColor('brand');
    const onBrandColor = useThemeColor('on-brand');

    const close = () => {
        setSelectedId(null);
        onCancel();
    };

    return (
        <Modal animationType="fade" onRequestClose={close} transparent visible={visible}>
            <View className="flex-1 items-center justify-center bg-[#0B1A11]/50 p-4">
                <View className="max-h-full w-full max-w-[420px] overflow-hidden rounded-lg bg-surface tc-shadow-lg">
                    <View className="items-center gap-3 px-5 pb-3 pt-6">
                        <View className="h-[52px] w-[52px] items-center justify-center rounded-pill bg-brand/12">
                            <ArrowLeftRight color={brandColor} size={24} strokeWidth={2} />
                        </View>
                        <Text className="text-center font-display text-[24px] leading-[26px] text-text">
                            {t('leagues:detail.transfer.title')}
                        </Text>
                        <Text className="text-center font-body text-[13px] leading-[19px] text-text-muted">
                            {t('leagues:detail.transfer.subtitle')}
                        </Text>
                    </View>

                    <ScrollView className="max-h-[280px] shrink-0 grow-0 px-5">
                        <View className="overflow-hidden rounded-md border border-border">
                            {candidates.map((candidate, index) => {
                                const selected = candidate.userId === selectedId;
                                return (
                                    <Pressable
                                        accessibilityRole="radio"
                                        accessibilityState={{ selected }}
                                        className={cn(
                                            'flex-row items-center gap-3 px-3.5 py-3',
                                            index > 0 && 'border-t border-border',
                                            selected && 'bg-brand/10',
                                        )}
                                        key={candidate.userId}
                                        onPress={() => setSelectedId(candidate.userId)}>
                                        <Avatar
                                            name={candidate.username}
                                            size="sm"
                                            uri={candidate.avatarUrl}
                                        />
                                        <Text
                                            className="flex-1 font-body-semibold text-[14.5px] text-text"
                                            numberOfLines={1}>
                                            {candidate.username}
                                        </Text>
                                        <View
                                            className={cn(
                                                'h-[22px] w-[22px] items-center justify-center rounded-pill border-[1.8px]',
                                                selected
                                                    ? 'border-brand bg-brand'
                                                    : 'border-border-strong',
                                            )}>
                                            {selected ? (
                                                <Check
                                                    color={onBrandColor}
                                                    size={13}
                                                    strokeWidth={3}
                                                />
                                            ) : null}
                                        </View>
                                    </Pressable>
                                );
                            })}
                        </View>
                    </ScrollView>

                    <Text className="px-5 pt-3 text-center font-body text-[12px] leading-[17px] text-text-faint">
                        {t('leagues:detail.transfer.note')}
                    </Text>

                    <View className="gap-2.5 px-5 pb-4 pt-3.5">
                        <Button
                            disabled={!selectedId || transferring}
                            fullWidth
                            loading={transferring}
                            onPress={() => selectedId && onConfirm(selectedId)}
                            title={t('leagues:detail.transfer.confirm')}
                        />
                        <Button
                            disabled={transferring}
                            fullWidth
                            onPress={close}
                            title={t('common:actions.cancel')}
                            variant="ghost"
                        />
                    </View>
                </View>
            </View>
        </Modal>
    );
}
