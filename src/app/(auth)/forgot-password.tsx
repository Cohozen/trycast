import { useState } from 'react';
import { KeyboardAvoidingView, Platform } from 'react-native';

import { FormBanner, FormField, PrimaryButton } from '@/components/form';
import { toFrenchAuthMessage } from '@/features/auth/errors';
import { validateEmail } from '@/features/auth/validation';
import { supabase } from '@/lib/supabase';
import { Link, ScrollView, Text, View } from '@/tw';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    setError(null);
    const emailError = validateEmail(email);
    if (emailError) {
      setError(emailError);
      return;
    }
    setSubmitting(true);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim());
    setSubmitting(false);
    if (resetError) {
      setError(toFrenchAuthMessage(resetError));
      return;
    }
    setSent(true);
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
          <Text className="text-3xl font-bold text-gray-900">Mot de passe oublié</Text>
          <Text className="text-base text-gray-500">
            On t’envoie un lien de réinitialisation par email.
          </Text>
        </View>

        {error ? <FormBanner message={error} tone="error" /> : null}
        {sent ? (
          <FormBanner message="Email envoyé ! Vérifie ta boîte mail." tone="success" />
        ) : null}

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
          <PrimaryButton
            title="Envoyer le lien"
            loading={submitting}
            disabled={!email || sent}
            onPress={onSubmit}
          />
        </View>

        <Link href="/login" className="text-center text-sm text-blue-600">
          Retour à la connexion
        </Link>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
