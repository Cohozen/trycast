import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { Toast } from '@/components/ui/toast';
import { toAuthMessageKey } from '@/features/auth/errors';
import { validateEmail } from '@/features/auth/validation';
import { supabase } from '@/lib/supabase';
import { Link, Text, View } from '@/tw';

export default function ForgotPasswordScreen() {
    const { t } = useTranslation(['auth', 'common']);
    const [email, setEmail] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const onSubmit = async () => {
        setError(null);
        const emailError = validateEmail(email);
        if (emailError) {
            setError(t(emailError));
            return;
        }
        setSubmitting(true);
        // Pas de `redirectTo` : l'e-mail de recovery porte un code à saisir dans
        // l'app (template `recovery`), aucun lien à faire atterrir quelque part.
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim());
        setSubmitting(false);
        if (resetError) {
            setError(t(toAuthMessageKey(resetError)));
            return;
        }
        // `sentAt` amorce le décompte avant renvoi sur l'écran suivant
        router.push({
            pathname: '/reset-password',
            params: { email: email.trim(), sentAt: String(Date.now()) },
        });
    };

    return (
        <Screen contentClassName="max-w-[440px] gap-5 px-6 pb-8">
            <View className="gap-1.5">
                {/* leading explicite : le ratio de text-h1 (1.03) rogne les ascendantes d'Anton */}
                <Text className="font-display text-h1 leading-[38px] text-text">
                    {t('auth:forgot.title')}
                </Text>
                <Text className="font-body text-body text-text-muted">
                    {t('auth:forgot.subtitle')}
                </Text>
            </View>

            {error ? <Toast message={error} tone="accent" /> : null}

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
                    disabled={!email}
                    fullWidth
                    loading={submitting}
                    onPress={onSubmit}
                    size="lg"
                    title={t('auth:actions.sendResetCode')}
                />
            </View>

            <Link
                className="text-center font-body-medium text-[13px] text-text-muted"
                href="/login">
                {t('auth:links.backToLogin')}
            </Link>
        </Screen>
    );
}
