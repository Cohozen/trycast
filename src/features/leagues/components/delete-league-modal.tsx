import { Check, Trash2, X } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from 'react-native';

import { Button } from '@/components/ui/button';
import { Pressable, Text, useThemeColor, View } from '@/tw';
import { cn } from '@/tw/variants';

type DeleteLeagueModalProps = {
    visible: boolean;
    leagueName: string;
    deleting: boolean;
    onConfirm: () => void;
    onCancel: () => void;
};

const LOSS_KEYS = [
    'leagues:detail.delete.losses.history',
    'leagues:detail.delete.losses.access',
    'leagues:detail.delete.losses.code',
] as const;

/**
 * Suppression d'une ligue (maquette Détail Ligue) : irréversible et
 * collective → confirmation forte, sur le moule de DeleteAccountModal —
 * liste des pertes + case « je comprends » qui arme le bouton.
 */
export function DeleteLeagueModal({
    visible,
    leagueName,
    deleting,
    onConfirm,
    onCancel,
}: DeleteLeagueModalProps) {
    const { t } = useTranslation(['leagues', 'common']);
    const [acknowledged, setAcknowledged] = useState(false);
    const dangerColor = useThemeColor('danger');
    const onDangerColor = useThemeColor('on-danger');

    const close = () => {
        setAcknowledged(false);
        onCancel();
    };

    return (
        <Modal animationType="fade" onRequestClose={close} transparent visible={visible}>
            <View className="flex-1 items-center justify-center bg-[#0B1A11]/50 p-4">
                <View className="w-full max-w-[420px] overflow-hidden rounded-lg bg-surface tc-shadow-lg">
                    <View className="gap-3.5 px-5 pb-4 pt-6">
                        <View className="items-center gap-3">
                            <View className="h-[52px] w-[52px] items-center justify-center rounded-pill bg-danger/15">
                                <Trash2 color={dangerColor} size={26} strokeWidth={1.9} />
                            </View>
                            <Text className="text-center font-display text-[24px] leading-[26px] text-text">
                                {t('leagues:detail.delete.title', { name: leagueName })}
                            </Text>
                            <Text className="text-center font-body text-[13px] leading-[19px] text-text-muted">
                                {t('leagues:detail.delete.intro')}
                            </Text>
                        </View>

                        <View className="gap-2 rounded-sm bg-danger/10 px-4 py-3">
                            {LOSS_KEYS.map((key) => (
                                <View className="flex-row items-center gap-2" key={key}>
                                    <X color={dangerColor} size={15} strokeWidth={2.4} />
                                    <Text className="flex-1 font-body text-[13px] text-text">
                                        {t(key)}
                                    </Text>
                                </View>
                            ))}
                        </View>

                        <Pressable
                            accessibilityRole="checkbox"
                            accessibilityState={{ checked: acknowledged }}
                            className="flex-row items-start gap-2.5"
                            onPress={() => setAcknowledged((v) => !v)}>
                            <View
                                className={cn(
                                    'mt-px h-[22px] w-[22px] items-center justify-center rounded-xs border-[1.8px]',
                                    acknowledged
                                        ? 'border-danger bg-danger'
                                        : 'border-border-strong bg-transparent',
                                )}>
                                {acknowledged ? (
                                    <Check color={onDangerColor} size={14} strokeWidth={3} />
                                ) : null}
                            </View>
                            <Text className="flex-1 font-body text-[13px] leading-[18px] text-text">
                                {t('leagues:detail.delete.acknowledge')}
                            </Text>
                        </Pressable>
                    </View>

                    <View className="gap-2.5 border-t border-border bg-surface px-5 pb-4 pt-3.5">
                        <Button
                            disabled={!acknowledged || deleting}
                            fullWidth
                            loading={deleting}
                            onPress={onConfirm}
                            title={t('leagues:detail.delete.confirm')}
                            variant="danger"
                        />
                        <Button
                            disabled={deleting}
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
