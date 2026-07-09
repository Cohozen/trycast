import { Check, Trash2, X } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from 'react-native';

import { Button } from '@/components/ui/button';
import { Pressable, Text, TextInput, useThemeColor, View } from '@/tw';
import { cn } from '@/tw/variants';

type DeleteAccountModalProps = {
    visible: boolean;
    /** Pseudo à re-saisir pour armer la confirmation */
    username: string;
    deleting: boolean;
    onConfirm: () => void;
    onCancel: () => void;
};

const LOSS_KEYS = [
    'profile:settings.delete.losses.predictions',
    'profile:settings.delete.losses.points',
    'profile:settings.delete.losses.leagues',
    'profile:settings.delete.losses.profile',
] as const;

/**
 * Modale de suppression de compte (maquette Réglages) : confirmation forte
 * par re-saisie du pseudo + case « je comprends », bouton armé seulement
 * quand les deux sont valides.
 */
export function DeleteAccountModal({
    visible,
    username,
    deleting,
    onConfirm,
    onCancel,
}: DeleteAccountModalProps) {
    const { t } = useTranslation(['profile', 'common']);
    const [typed, setTyped] = useState('');
    const [acknowledged, setAcknowledged] = useState(false);

    const dangerColor = useThemeColor('danger');
    const successColor = useThemeColor('success');
    const onBrandColor = useThemeColor('on-brand');
    const placeholderColor = useThemeColor('text-faint');

    const matches = typed.trim() === username;
    const armed = matches && acknowledged && !deleting;

    const close = () => {
        setTyped('');
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
                            <Text className="text-center font-display text-[25px] leading-[27px] tracking-[0.25px] text-text">
                                {t('profile:settings.delete.modalTitle')}
                            </Text>
                            <Text className="text-center font-body text-[13px] leading-[19px] text-text-muted">
                                {t('profile:settings.delete.modalIntro')}
                            </Text>
                        </View>

                        <View className="gap-2 rounded-sm bg-danger/10 px-4 py-3">
                            {LOSS_KEYS.map((key) => (
                                <View className="flex-row items-center gap-2" key={key}>
                                    <X color={dangerColor} size={15} strokeWidth={2.4} />
                                    <Text className="font-body text-[13px] text-text">
                                        {t(key)}
                                    </Text>
                                </View>
                            ))}
                        </View>

                        <View className="gap-2">
                            <Text className="font-body text-[12.5px] leading-[18px] text-text-muted">
                                {t('profile:settings.delete.confirmPrompt', { username })}
                            </Text>
                            <View
                                className={cn(
                                    'h-12 flex-row items-center gap-2 rounded-sm border-[1.5px] border-border-strong bg-surface px-3.5',
                                    matches && 'border-success',
                                )}>
                                <TextInput
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    className="min-w-0 flex-1 font-body text-[15px] text-text"
                                    onChangeText={setTyped}
                                    placeholder={username}
                                    placeholderTextColor={placeholderColor}
                                    value={typed}
                                />
                                {matches ? (
                                    <Check color={successColor} size={18} strokeWidth={2.6} />
                                ) : null}
                            </View>
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
                                        ? 'border-brand bg-brand'
                                        : 'border-border-strong bg-transparent',
                                )}>
                                {acknowledged ? (
                                    <Check color={onBrandColor} size={14} strokeWidth={3} />
                                ) : null}
                            </View>
                            <Text className="flex-1 font-body text-[13px] leading-[18px] text-text">
                                {t('profile:settings.delete.acknowledge')}
                            </Text>
                        </Pressable>
                    </View>

                    <View className="gap-2.5 border-t border-border bg-surface px-5 pb-4 pt-3.5">
                        <Button
                            disabled={!armed}
                            fullWidth
                            loading={deleting}
                            onPress={onConfirm}
                            title={
                                deleting
                                    ? t('profile:settings.delete.deleting')
                                    : t('profile:settings.delete.confirm')
                            }
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
