import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform } from 'react-native';

import { BrandMark } from '@/components/brand-mark';
import { Button } from '@/components/ui/button';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { TextField } from '@/components/ui/text-field';
import { Toast } from '@/components/ui/toast';
import { toAuthMessageKey } from '@/features/auth/errors';
import {
    validateEmail,
    validatePassword,
    validatePasswordConfirmation,
    validateUsername,
} from '@/features/auth/validation';
import { supabase } from '@/lib/supabase';
import { Link, ScrollView, Text, View } from '@/tw';

type AuthMode = 'login' | 'signup';

type FieldErrors = Partial<Record<'username' | 'email' | 'password' | 'confirm', string | null>>;

/**
 * Écran d'authentification unique (maquette TryCast Auth) : zone de marque,
 * bascule Connexion/Inscription segmentée, formulaire e-mail + mot de passe.
 * Pas de redirection manuelle après succès : Stack.Protected bascule sur
 * (app) dès que la session existe.
 */
export function AuthScreen({ initialMode }: { initialMode: AuthMode }) {
    const { t } = useTranslation(['auth', 'common']);
    const [mode, setMode] = useState<AuthMode>(initialMode);

    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
    const [error, setError] = useState<string | null>(null);
    const [info, setInfo] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const switchMode = (next: AuthMode) => {
        setMode(next);
        setFieldErrors({});
        setError(null);
        setInfo(null);
    };

    const onLogin = async () => {
        setError(null);
        setSubmitting(true);
        const { error: signInError } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
        });
        setSubmitting(false);
        if (signInError) {
            setError(t(toAuthMessageKey(signInError)));
        }
    };

    const onSignup = async () => {
        setError(null);
        setInfo(null);

        const errors = {
            username: validateUsername(username),
            email: validateEmail(email),
            password: validatePassword(password),
            confirm: validatePasswordConfirmation(password, confirm),
        };
        setFieldErrors({
            username: errors.username && t(errors.username),
            email: errors.email && t(errors.email),
            password: errors.password && t(errors.password),
            confirm: errors.confirm && t(errors.confirm),
        });
        if (errors.username || errors.email || errors.password || errors.confirm) {
            return;
        }

        setSubmitting(true);
        try {
            const { data: available, error: rpcError } = await supabase.rpc('username_available', {
                candidate: username,
            });
            if (rpcError) {
                setError(t(toAuthMessageKey(rpcError)));
                return;
            }
            if (!available) {
                setFieldErrors({ username: t('auth:errors.usernameTaken') });
                return;
            }

            const { data, error: signUpError } = await supabase.auth.signUp({
                email: email.trim(),
                password,
                options: { data: { username } },
            });
            if (signUpError) {
                setError(t(toAuthMessageKey(signUpError)));
                return;
            }
            if (!data.session) {
                // Confirmation email activée côté projet : pas de session immédiate
                setInfo(t('auth:banners.accountCreated'));
            }
        } finally {
            setSubmitting(false);
        }
    };

    const isLogin = mode === 'login';

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ flex: 1 }}>
            <ScrollView
                className="flex-1 bg-bg"
                contentContainerClassName="w-full max-w-[440px] flex-grow justify-center gap-5 self-center px-6 py-8"
                keyboardShouldPersistTaps="handled">
                <View className="items-center gap-2.5 pt-3.5">
                    <BrandMark />
                    <Text className="font-display text-[38px] leading-[34px] tracking-[0.5px] text-text">
                        TryCast
                    </Text>
                    <Text className="text-center font-body text-[14px] text-text-muted">
                        {t('auth:brand.tagline')}
                    </Text>
                </View>

                <SegmentedControl
                    onChange={switchMode}
                    options={[
                        { value: 'login', label: t('auth:mode.login') },
                        { value: 'signup', label: t('auth:mode.signup') },
                    ]}
                    value={mode}
                />

                {error ? <Toast message={error} tone="accent" /> : null}
                {info ? <Toast message={info} tone="success" /> : null}

                {isLogin ? (
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
                        <TextField
                            autoCapitalize="none"
                            autoComplete="current-password"
                            label={t('auth:fields.password.label')}
                            onChangeText={setPassword}
                            placeholder={t('auth:fields.password.placeholder')}
                            secureTextEntry
                            value={password}
                        />
                        <View className="-mt-1 items-end">
                            <Link
                                className="font-body-medium text-[13px] text-text-muted"
                                href="/forgot-password">
                                {t('auth:links.forgotPassword')}
                            </Link>
                        </View>
                        <View className="mt-1">
                            <Button
                                disabled={!email || !password}
                                fullWidth
                                loading={submitting}
                                onPress={onLogin}
                                size="lg"
                                title={t('auth:actions.login')}
                            />
                        </View>
                    </View>
                ) : (
                    <View className="gap-3.5">
                        <TextField
                            autoCapitalize="none"
                            autoCorrect={false}
                            error={fieldErrors.username}
                            label={t('auth:fields.username.label')}
                            onChangeText={setUsername}
                            placeholder={t('auth:fields.username.placeholder')}
                            value={username}
                        />
                        <TextField
                            autoCapitalize="none"
                            autoComplete="email"
                            error={fieldErrors.email}
                            keyboardType="email-address"
                            label={t('auth:fields.email.label')}
                            onChangeText={setEmail}
                            placeholder={t('auth:fields.email.placeholder')}
                            value={email}
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
                                disabled={!username || !email || !password || !confirm}
                                fullWidth
                                loading={submitting}
                                onPress={onSignup}
                                size="lg"
                                title={t('auth:actions.signup')}
                            />
                        </View>
                    </View>
                )}
            </ScrollView>
        </KeyboardAvoidingView>
    );
}
