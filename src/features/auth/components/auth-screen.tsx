import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform } from 'react-native';

import { BrandMark } from '@/components/brand-mark';
import { Button } from '@/components/ui/button';
import { Divider } from '@/components/ui/divider';
import { Screen } from '@/components/ui/screen';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { TextField } from '@/components/ui/text-field';
import { Toast } from '@/components/ui/toast';
import { LegalNotice } from '@/features/auth/components/legal-notice';
import { OAuthButton } from '@/features/auth/components/oauth-button';
import { toAuthMessageKey } from '@/features/auth/errors';
import { resolveProviders } from '@/features/auth/providers';
import { useOAuthSignIn } from '@/features/auth/use-oauth-sign-in';
import {
    validateEmail,
    validatePassword,
    validatePasswordConfirmation,
    validateUsername,
} from '@/features/auth/validation';
import { trackEvent } from '@/lib/analytics';
import { supabase } from '@/lib/supabase';
import { EMAIL_CONFIRM_URL } from '@/lib/urls';
import { Link, Text, View } from '@/tw';

type AuthMode = 'login' | 'signup';

type FieldErrors = Partial<Record<'username' | 'email' | 'password' | 'confirm', string | null>>;

// Ni la plateforme ni les identifiants configurés ne changent pendant la vie de
// l'app : la liste se résout une fois pour toutes.
const PROVIDERS = resolveProviders(Platform.OS);

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
    const oauthSignIn = useOAuthSignIn();

    const switchMode = (next: AuthMode) => {
        setMode(next);
        setFieldErrors({});
        setError(null);
        setInfo(null);
        oauthSignIn.reset();
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
            return;
        }
        trackEvent({ name: 'signed_in', props: { method: 'password' } });
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
                options: { data: { username }, emailRedirectTo: EMAIL_CONFIRM_URL },
            });
            if (signUpError) {
                setError(t(toAuthMessageKey(signUpError)));
                return;
            }
            trackEvent({ name: 'account_created', props: { method: 'password' } });
            if (!data.session) {
                // Confirmation email activée côté projet : pas de session immédiate
                setInfo(t('auth:banners.accountCreated'));
            }
        } finally {
            setSubmitting(false);
        }
    };

    const isLogin = mode === 'login';
    // Un fournisseur sert indifféremment à se connecter et à s'inscrire : la
    // mention légale doit donc suivre les boutons jusque sur l'onglet Connexion,
    // sinon elle disparaît du parcours d'inscription le plus court.
    const showsLegalNotice = !isLogin || PROVIDERS.length > 0;
    // Erreur du formulaire ou du fournisseur : même bandeau, une seule à la fois.
    const displayedError = error ?? (oauthSignIn.error && t(toAuthMessageKey(oauthSignIn.error)));

    return (
        <Screen contentClassName="max-w-[440px] gap-5 px-6 pb-8">
            <View className="items-center gap-2.5 pt-3.5">
                <BrandMark />
                <Text className="font-display text-[38px] leading-8.5 tracking-[0.5px] text-text">
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

            {displayedError ? <Toast message={displayedError} tone="accent" /> : null}
            {info ? <Toast message={info} tone="success" /> : null}

            {PROVIDERS.length > 0 ? (
                <View className="gap-3">
                    {PROVIDERS.map((provider) => (
                        <OAuthButton
                            disabled={oauthSignIn.isPending}
                            key={provider.id}
                            loading={
                                oauthSignIn.isPending && oauthSignIn.variables?.id === provider.id
                            }
                            onPress={oauthSignIn.mutate}
                            provider={provider}
                        />
                    ))}
                    <Divider label={t('auth:dividers.or')} />
                </View>
            ) : null}

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

            {showsLegalNotice ? <LegalNotice /> : null}
        </Screen>
    );
}
