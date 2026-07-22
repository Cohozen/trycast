import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { Toast } from '@/components/ui/toast';
import { toAuthMessageKey } from '@/features/auth/errors';
import { resendCooldownSeconds } from '@/features/auth/reset-code';
import { useResetPassword } from '@/features/auth/use-reset-password';
import {
    RESET_CODE_LENGTH,
    validatePassword,
    validatePasswordConfirmation,
    validateResetCode,
} from '@/features/auth/validation';
import { supabase } from '@/lib/supabase';
import { Link, Text, View } from '@/tw';

type FieldErrors = Partial<Record<'code' | 'password' | 'confirm', string | null>>;

/**
 * Saisie du code reçu par e-mail + choix du nouveau mot de passe.
 * En cas de succès aucune redirection manuelle : `verifyOtp` ouvre la session
 * et `Stack.Protected` bascule seul sur `(app)`.
 */
export default function ResetPasswordScreen() {
    const { t } = useTranslation(['auth', 'common']);
    const { email, sentAt } = useLocalSearchParams<{ email: string; sentAt?: string }>();

    const [code, setCode] = useState('');
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
    const [error, setError] = useState<string | null>(null);
    const resetPassword = useResetPassword();

    const [lastSentAt, setLastSentAt] = useState(() => Number(sentAt) || Date.now());
    const [resending, setResending] = useState(false);
    const [resent, setResent] = useState(false);
    const [now, setNow] = useState(() => Date.now());
    const cooldown = resendCooldownSeconds(lastSentAt, now);
    const cooling = cooldown > 0;

    // Le tic n'existe que pendant le décompte : au-delà, plus rien ne bouge
    useEffect(() => {
        if (!cooling) {
            return;
        }
        const id = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(id);
    }, [cooling]);

    const onResend = async () => {
        setError(null);
        setResent(false);
        setResending(true);
        const { error: resendError } = await supabase.auth.resetPasswordForEmail(email.trim());
        setResending(false);
        if (resendError) {
            setError(t(toAuthMessageKey(resendError)));
            return;
        }
        // Le serveur vient d'invalider le code précédent : on vide la saisie
        setLastSentAt(Date.now());
        setCode('');
        setFieldErrors((previous) => ({ ...previous, code: null }));
        setResent(true);
    };

    const onSubmit = () => {
        setError(null);
        const errors = {
            code: validateResetCode(code),
            password: validatePassword(password),
            confirm: validatePasswordConfirmation(password, confirm),
        };
        setFieldErrors({
            code: errors.code && t(errors.code),
            password: errors.password && t(errors.password),
            confirm: errors.confirm && t(errors.confirm),
        });
        if (errors.code || errors.password || errors.confirm) {
            return;
        }

        resetPassword.mutate(
            { email, code, password },
            { onError: (mutationError) => setError(t(toAuthMessageKey(mutationError))) },
        );
    };

    return (
        <Screen contentClassName="max-w-[440px] gap-5 px-6 pb-8">
            <View className="gap-1.5">
                {/* leading explicite : le ratio de text-h1 (1.03) rogne les ascendantes d'Anton */}
                <Text className="font-display text-h1 leading-[38px] text-text">
                    {t('auth:reset.title')}
                </Text>
                <Text className="font-body text-body text-text-muted">
                    {t('auth:reset.subtitle', { email })}
                </Text>
            </View>

            {error ? <Toast message={error} tone="accent" /> : null}
            {resent ? <Toast message={t('auth:reset.resent')} tone="success" /> : null}

            <View className="gap-3.5">
                <TextField
                    autoCapitalize="none"
                    autoCorrect={false}
                    error={fieldErrors.code}
                    keyboardType="number-pad"
                    label={t('auth:fields.resetCode.label')}
                    maxLength={RESET_CODE_LENGTH}
                    onChangeText={setCode}
                    placeholder={t('auth:fields.resetCode.placeholder')}
                    textContentType="oneTimeCode"
                    value={code}
                />
                <TextField
                    autoCapitalize="none"
                    autoComplete="new-password"
                    error={fieldErrors.password}
                    label={t('auth:fields.newPassword.label')}
                    onChangeText={setPassword}
                    placeholder={t('auth:fields.newPassword.placeholder')}
                    secureTextEntry
                    value={password}
                />
                <TextField
                    autoCapitalize="none"
                    autoComplete="new-password"
                    error={fieldErrors.confirm}
                    label={t('auth:fields.confirmPassword.label')}
                    onChangeText={setConfirm}
                    placeholder={t('auth:fields.confirmPassword.placeholder')}
                    secureTextEntry
                    value={confirm}
                />
                <View className="mt-1">
                    <Button
                        disabled={!code || !password || !confirm}
                        fullWidth
                        loading={resetPassword.isPending}
                        onPress={onSubmit}
                        size="lg"
                        title={t('auth:actions.resetPassword')}
                    />
                </View>
            </View>

            <Button
                disabled={cooling || resending}
                fullWidth
                loading={resending}
                onPress={onResend}
                title={
                    cooling
                        ? t('auth:reset.resendIn', { seconds: cooldown })
                        : t('auth:reset.resend')
                }
                variant="ghost"
            />

            <Link
                className="text-center font-body-medium text-[13px] text-text-muted"
                href="/login">
                {t('auth:links.backToLogin')}
            </Link>
        </Screen>
    );
}
