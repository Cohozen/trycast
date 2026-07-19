import { Mail } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Modal, Platform, StyleSheet } from 'react-native';

import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { Toast } from '@/components/ui/toast';
import { toAuthMessageKey } from '@/features/auth/errors';
import { validateEmail } from '@/features/auth/validation';
import { useUpdateEmail } from '@/features/profile/use-update-email';
import { Text, useThemeColor, View } from '@/tw';

type EmailEditorModalProps = {
    visible: boolean;
    /** Adresse actuelle, pour bloquer une saisie identique. */
    currentEmail: string;
    onClose: () => void;
    /** Succès (lien envoyé) remonté à l'écran (toast dans les Réglages). */
    onSuccess: () => void;
};

/**
 * Modale « Changer d'adresse e-mail » (maquette Réglages) : nouvelle adresse,
 * validation locale (format, différente de l'actuelle) puis
 * `supabase.auth.updateUser`. Le changement n'est effectif qu'après
 * confirmation par e-mail — la modale se ferme sur un message « lien envoyé ».
 */
export function EmailEditorModal({
    visible,
    currentEmail,
    onClose,
    onSuccess,
}: EmailEditorModalProps) {
    const { t } = useTranslation(['profile', 'auth', 'common']);
    const updateEmail = useUpdateEmail();

    const [email, setEmail] = useState('');
    const [fieldError, setFieldError] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const brandColor = useThemeColor('brand');

    const reset = () => {
        setEmail('');
        setFieldError(null);
        setError(null);
    };

    const close = () => {
        reset();
        onClose();
    };

    const onSubmit = async () => {
        setError(null);
        const next = email.trim();
        const formatError = validateEmail(next);
        if (formatError) {
            setFieldError(t(formatError));
            return;
        }
        if (next.toLowerCase() === currentEmail.trim().toLowerCase()) {
            setFieldError(t('profile:settings.email.sameEmail'));
            return;
        }
        setFieldError(null);
        try {
            await updateEmail.mutateAsync(next);
            reset();
            onSuccess();
            onClose();
        } catch (err) {
            setError(t(toAuthMessageKey(err)));
        }
    };

    return (
        <Modal animationType="fade" onRequestClose={close} transparent visible={visible}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={StyleSheet.absoluteFill}>
                <View className="flex-1 items-center justify-center bg-[#0B1A11]/50 p-4">
                    <View className="w-full max-w-[420px] overflow-hidden rounded-lg bg-surface tc-shadow-lg">
                        <View className="gap-3.5 px-5 pb-4 pt-6">
                            <View className="items-center gap-3">
                                <View className="h-[52px] w-[52px] items-center justify-center rounded-pill bg-brand/15">
                                    <Mail color={brandColor} size={25} strokeWidth={1.9} />
                                </View>
                                <Text className="text-center font-display text-[25px] leading-[27px] tracking-[0.25px] text-text">
                                    {t('profile:settings.email.modalTitle')}
                                </Text>
                                <Text className="text-center font-body text-[13px] leading-[19px] text-text-muted">
                                    {t('profile:settings.email.modalIntro')}
                                </Text>
                            </View>

                            {error ? <Toast message={error} tone="accent" /> : null}

                            <TextField
                                autoCapitalize="none"
                                autoComplete="email"
                                autoCorrect={false}
                                error={fieldError}
                                keyboardType="email-address"
                                label={t('profile:settings.email.newLabel')}
                                onChangeText={setEmail}
                                placeholder={t('auth:fields.email.placeholder')}
                                textContentType="emailAddress"
                                value={email}
                            />
                        </View>

                        <View className="gap-2.5 border-t border-border bg-surface px-5 pb-4 pt-3.5">
                            <Button
                                disabled={!email || updateEmail.isPending}
                                fullWidth
                                loading={updateEmail.isPending}
                                onPress={onSubmit}
                                title={t('profile:settings.email.confirm')}
                            />
                            <Button
                                disabled={updateEmail.isPending}
                                fullWidth
                                onPress={close}
                                title={t('common:actions.cancel')}
                                variant="ghost"
                            />
                        </View>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}
