import { useState } from 'react';
import { KeyboardAvoidingView, Platform } from 'react-native';

import { FormBanner, FormField, PrimaryButton } from '@/components/form';
import { toFrenchAuthMessage } from '@/features/auth/errors';
import { validateEmail, validatePassword, validateUsername } from '@/features/auth/validation';
import { supabase } from '@/lib/supabase';
import { Link, ScrollView, Text, View } from '@/tw';

export default function SignupScreen() {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fieldErrors, setFieldErrors] = useState<{
        username?: string | null;
        email?: string | null;
        password?: string | null;
    }>({});
    const [error, setError] = useState<string | null>(null);
    const [info, setInfo] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const onSubmit = async () => {
        setError(null);
        setInfo(null);

        const errors = {
            username: validateUsername(username),
            email: validateEmail(email),
            password: validatePassword(password),
        };
        setFieldErrors(errors);
        if (errors.username || errors.email || errors.password) {
            return;
        }

        setSubmitting(true);
        try {
            const { data: available, error: rpcError } = await supabase.rpc('username_available', {
                candidate: username,
            });
            if (rpcError) {
                setError(toFrenchAuthMessage(rpcError));
                return;
            }
            if (!available) {
                setFieldErrors({ username: 'Ce pseudo est déjà pris.' });
                return;
            }

            const { data, error: signUpError } = await supabase.auth.signUp({
                email: email.trim(),
                password,
                options: { data: { username } },
            });
            if (signUpError) {
                setError(toFrenchAuthMessage(signUpError));
                return;
            }
            if (!data.session) {
                // Confirmation email activée côté projet : pas de session immédiate
                setInfo('Compte créé ! Vérifie ta boîte mail pour confirmer ton adresse.');
            }
            // Sinon, Stack.Protected bascule automatiquement sur (app)
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ flex: 1 }}>
            <ScrollView
                className="flex-1 bg-white"
                contentContainerClassName="flex-grow justify-center gap-6 p-6"
                keyboardShouldPersistTaps="handled">
                <View className="gap-1">
                    <Text className="text-3xl font-bold text-gray-900">Crée ton compte</Text>
                    <Text className="text-base text-gray-500">
                        Un pseudo, un email, et c’est parti pour les pronos.
                    </Text>
                </View>

                {error ? <FormBanner message={error} tone="error" /> : null}
                {info ? <FormBanner message={info} tone="success" /> : null}

                <View className="gap-4">
                    <FormField
                        label="Pseudo"
                        autoCapitalize="none"
                        autoCorrect={false}
                        placeholder="ton_pseudo"
                        value={username}
                        error={fieldErrors.username}
                        onChangeText={setUsername}
                    />
                    <FormField
                        label="Email"
                        autoCapitalize="none"
                        autoComplete="email"
                        keyboardType="email-address"
                        placeholder="toi@exemple.fr"
                        value={email}
                        error={fieldErrors.email}
                        onChangeText={setEmail}
                    />
                    <FormField
                        label="Mot de passe"
                        autoCapitalize="none"
                        autoComplete="new-password"
                        secureTextEntry
                        placeholder="8 caractères minimum"
                        value={password}
                        error={fieldErrors.password}
                        onChangeText={setPassword}
                    />
                    <PrimaryButton
                        title="S’inscrire"
                        loading={submitting}
                        disabled={!username || !email || !password}
                        onPress={onSubmit}
                    />
                </View>

                <Link href="/login" className="text-center text-sm text-gray-500">
                    Déjà un compte ?{' '}
                    <Text className="font-semibold text-blue-600">Connecte-toi</Text>
                </Link>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}
