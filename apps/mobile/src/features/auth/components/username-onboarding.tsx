import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { BrandMark } from '@/components/brand-mark';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { Toast } from '@/components/ui/toast';
import { signInMethods } from '@/features/auth/identity';
import { useSession } from '@/features/auth/session-context';
import { useClaimUsername } from '@/features/auth/use-claim-username';
import { validateUsername } from '@/features/auth/validation';
import { toProfileMessageKey } from '@/features/profile/errors';
import { supabase } from '@/lib/supabase';
import type { SignInMethod } from '@/lib/analytics-events';
import { Text, View } from '@/tw';

/**
 * Choix du pseudo à la première connexion via un fournisseur d'identité.
 *
 * Un compte Google n'apporte aucun pseudo : le trigger SQL en pose un de repli
 * (`user_a3f21b04`), et cet écran est la porte qui empêche ce repli d'atterrir
 * en tête d'un classement. Passage obligé, d'où l'absence de bouton retour —
 * la seule sortie est une déconnexion explicite.
 *
 * Aucune redirection à la validation : écrire le profil en cache fait basculer
 * `Stack.Protected` sur `(app)`.
 */
export function UsernameOnboarding() {
    const { t } = useTranslation(['auth', 'profile', 'common']);
    const { session } = useSession();

    // Le compte vient forcément d'un fournisseur : un compte e-mail choisit son
    // pseudo à l'inscription et n'atteint jamais cet écran.
    const method: SignInMethod =
        signInMethods(session?.user).find((provider) => provider !== 'email') ?? 'password';
    const claimUsername = useClaimUsername(session?.user.id, method);

    const [username, setUsername] = useState('');
    const [fieldError, setFieldError] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const onSubmit = async () => {
        setError(null);
        const validationError = validateUsername(username);
        if (validationError) {
            setFieldError(t(validationError));
            return;
        }
        setFieldError(null);
        try {
            await claimUsername.mutateAsync(username);
        } catch (err) {
            const key = toProfileMessageKey(err);
            if (key === 'common:errors.generic') {
                setError(t(key));
            } else {
                setFieldError(t(key));
            }
        }
    };

    return (
        <Screen contentClassName="max-w-[440px] gap-5 px-6 pb-8">
            <View className="items-center gap-2.5 pt-3.5">
                <BrandMark />
                <Text className="text-center font-display text-[28px] leading-8 tracking-[0.5px] text-text">
                    {t('auth:onboarding.username.title')}
                </Text>
                <Text className="text-center font-body text-[14px] leading-5 text-text-muted">
                    {t('auth:onboarding.username.subtitle')}
                </Text>
            </View>

            {error ? <Toast message={error} tone="accent" /> : null}

            <View className="gap-3.5">
                <TextField
                    autoCapitalize="none"
                    autoCorrect={false}
                    error={fieldError}
                    label={t('auth:fields.username.label')}
                    onChangeText={setUsername}
                    placeholder={t('auth:fields.username.placeholder')}
                    value={username}
                />
                <Text className="font-body text-[11.5px] leading-[16px] text-text-faint">
                    {t('auth:onboarding.username.hint')}
                </Text>
                <View className="mt-1">
                    <Button
                        disabled={!username}
                        fullWidth
                        loading={claimUsername.isPending}
                        onPress={onSubmit}
                        size="lg"
                        title={t('auth:actions.chooseUsername')}
                    />
                </View>
            </View>

            <View className="items-center">
                <Button
                    onPress={() => supabase.auth.signOut()}
                    size="sm"
                    title={t('auth:actions.signOut')}
                    variant="ghost"
                />
            </View>
        </Screen>
    );
}
