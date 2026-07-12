import { KeyRound } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from 'react-native';

import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { Toast } from '@/components/ui/toast';
import { toAuthMessageKey } from '@/features/auth/errors';
import { validatePassword, validatePasswordConfirmation } from '@/features/auth/validation';
import { useUpdatePassword } from '@/features/profile/use-update-password';
import { Text, useThemeColor, View } from '@/tw';

type PasswordEditorModalProps = {
    visible: boolean;
    onClose: () => void;
    /** Succès remonté à l'écran (toast dans les Réglages) */
    onSuccess: () => void;
};

/**
 * Modale « Modifier le mot de passe » (maquette Réglages) : nouveau mot de
 * passe + vérification, validation locale (longueur, concordance) puis
 * `supabase.auth.updateUser`. Les erreurs serveur (mot de passe identique,
 * trop faible, session expirée) passent par `toAuthMessageKey`.
 */
export function PasswordEditorModal({ visible, onClose, onSuccess }: PasswordEditorModalProps) {
    const { t } = useTranslation(['profile', 'auth', 'common']);
    const updatePassword = useUpdatePassword();

    const [password, setPassword] = useState('');
    const [confirmation, setConfirmation] = useState('');
    const [fieldError, setFieldError] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const brandColor = useThemeColor('brand');

    const reset = () => {
        setPassword('');
        setConfirmation('');
        setFieldError(null);
        setError(null);
    };

    const close = () => {
        reset();
        onClose();
    };

    const onSubmit = async () => {
        setError(null);
        const lengthError = validatePassword(password);
        if (lengthError) {
            setFieldError(t(lengthError));
            return;
        }
        const mismatch = validatePasswordConfirmation(password, confirmation);
        if (mismatch) {
            setFieldError(t(mismatch));
            return;
        }
        setFieldError(null);
        try {
            await updatePassword.mutateAsync(password);
            reset();
            onSuccess();
            onClose();
        } catch (err) {
            setError(t(toAuthMessageKey(err)));
        }
    };

    return (
        <Modal animationType="fade" onRequestClose={close} transparent visible={visible}>
            <View className="flex-1 items-center justify-center bg-[#0B1A11]/50 p-4">
                <View className="w-full max-w-[420px] overflow-hidden rounded-lg bg-surface tc-shadow-lg">
                    <View className="gap-3.5 px-5 pb-4 pt-6">
                        <View className="items-center gap-3">
                            <View className="h-[52px] w-[52px] items-center justify-center rounded-pill bg-brand/15">
                                <KeyRound color={brandColor} size={25} strokeWidth={1.9} />
                            </View>
                            <Text className="text-center font-display text-[25px] leading-[27px] tracking-[0.25px] text-text">
                                {t('profile:settings.password.modalTitle')}
                            </Text>
                            <Text className="text-center font-body text-[13px] leading-[19px] text-text-muted">
                                {t('profile:settings.password.modalIntro')}
                            </Text>
                        </View>

                        {error ? <Toast message={error} tone="accent" /> : null}

                        <View className="gap-2.5">
                            <TextField
                                autoCapitalize="none"
                                autoCorrect={false}
                                label={t('auth:fields.newPassword.label')}
                                onChangeText={setPassword}
                                placeholder={t('auth:fields.newPassword.placeholder')}
                                secureTextEntry
                                textContentType="newPassword"
                                value={password}
                            />
                            <TextField
                                autoCapitalize="none"
                                autoCorrect={false}
                                error={fieldError}
                                label={t('auth:fields.confirmPassword.label')}
                                onChangeText={setConfirmation}
                                placeholder={t('auth:fields.confirmPassword.placeholder')}
                                secureTextEntry
                                textContentType="newPassword"
                                value={confirmation}
                            />
                        </View>
                    </View>

                    <View className="gap-2.5 border-t border-border bg-surface px-5 pb-4 pt-3.5">
                        <Button
                            disabled={!password || !confirmation || updatePassword.isPending}
                            fullWidth
                            loading={updatePassword.isPending}
                            onPress={onSubmit}
                            title={t('profile:settings.password.confirm')}
                        />
                        <Button
                            disabled={updatePassword.isPending}
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
