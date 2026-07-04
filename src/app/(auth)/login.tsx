import { useState } from 'react';
import { KeyboardAvoidingView, Platform } from 'react-native';

import { FormBanner, FormField, PrimaryButton } from '@/components/form';
import { toFrenchAuthMessage } from '@/features/auth/errors';
import { supabase } from '@/lib/supabase';
import { Link, ScrollView, Text, View } from '@/tw';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    setError(null);
    setSubmitting(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setSubmitting(false);
    if (signInError) {
      setError(toFrenchAuthMessage(signInError));
    }
    // Pas de redirection manuelle : Stack.Protected bascule sur (app) dès que la session existe
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
          <Text className="text-3xl font-bold text-gray-900">TryCast 🏉</Text>
          <Text className="text-base text-gray-500">Connecte-toi pour pronostiquer.</Text>
        </View>

        {error ? <FormBanner message={error} tone="error" /> : null}

        <View className="gap-4">
          <FormField
            label="Email"
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            placeholder="toi@exemple.fr"
            value={email}
            onChangeText={setEmail}
          />
          <FormField
            label="Mot de passe"
            autoCapitalize="none"
            autoComplete="current-password"
            secureTextEntry
            placeholder="••••••••"
            value={password}
            onChangeText={setPassword}
          />
          <PrimaryButton
            title="Se connecter"
            loading={submitting}
            disabled={!email || !password}
            onPress={onSubmit}
          />
        </View>

        <View className="gap-3">
          <Link href="/forgot-password" className="text-center text-sm text-blue-600">
            Mot de passe oublié ?
          </Link>
          <Link href="/signup" className="text-center text-sm text-gray-500">
            Pas encore de compte ? <Text className="font-semibold text-blue-600">Inscris-toi</Text>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
