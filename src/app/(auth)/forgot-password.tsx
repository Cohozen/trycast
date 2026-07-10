import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { Toast } from '@/components/ui/toast';
import { toAuthMessageKey } from '@/features/auth/errors';
import { validateEmail } from '@/features/auth/validation';
import { supabase } from '@/lib/supabase';
import { Link, ScrollView, Text, View } from '@/tw';

export default function ForgotPasswordScreen() {
    const { t } = useTranslation(['auth', 'common']);
    const [email, setEmail] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [sent, setSent] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const onSubmit = async () => {
        setError(null);
        const emailError = validateEmail(email);
        if (emailError) {
            setError(t(emailError));
            return;
        }
        setSubmitting(true);
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim());
        setSubmitting(false);
        if (resetError) {
            setError(t(toAuthMessageKey(resetError)));
            return;
        }
        setSent(true);
    };

    return (
        <ScrollView
            automaticallyAdjustKeyboardInsets
            className="flex-1 bg-bg"
            contentContainerClassName="w-full max-w-[440px] gap-5 self-center px-6 pb-8 pt-14"
            keyboardDismissMode="interactive"
            keyboardShouldPersistTaps="handled">
            <View className="gap-1.5">
                <Text className="font-display text-h1 text-text">{t('auth:forgot.title')}</Text>
                <Text className="font-body text-body text-text-muted">
                    {t('auth:forgot.subtitle')}
                </Text>
            </View>

            {error ? <Toast message={error} tone="accent" /> : null}
            {sent ? <Toast message={t('auth:forgot.sent')} tone="success" /> : null}

            <View className="gap-3.5">
                <TextField
                    autoCapitalize="none"
                    autoComplete="email"
                    keyboardType="email-address"
                    label={t('auth:fields.email.label')}
                    onChangeText={setEmail}
                    placeholder={t('auth:fields.email.placeholder')}
                    value={email}
                />
                <Button
                    disabled={!email || sent}
                    fullWidth
                    loading={submitting}
                    onPress={onSubmit}
                    size="lg"
                    title={t('auth:actions.sendResetLink')}
                />
            </View>

            <Link
                className="text-center font-body-medium text-[13px] text-text-muted"
                href="/login">
                {t('auth:links.backToLogin')}
            </Link>
        </ScrollView>
    );
}
