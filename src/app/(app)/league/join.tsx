import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform } from 'react-native';

import { FormBanner, FormField, PrimaryButton } from '@/components/form';
import { toFrenchLeagueMessage } from '@/features/leagues/errors';
import { useJoinLeague } from '@/features/leagues/use-join-league';
import { normalizeInviteCode } from '@/features/leagues/validation';
import { ScrollView, Text, View } from '@/tw';

export default function JoinLeagueScreen() {
    const router = useRouter();
    const joinLeague = useJoinLeague();
    const [rawCode, setRawCode] = useState('');
    const [fieldError, setFieldError] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const onSubmit = () => {
        setError(null);
        const code = normalizeInviteCode(rawCode);
        if (!code) {
            setFieldError('Le code fait 8 caractères (lettres et chiffres).');
            return;
        }
        setFieldError(null);

        joinLeague.mutate(code, {
            onSuccess: (league) => {
                router.replace({ pathname: '/league/[id]', params: { id: league.id } });
            },
            onError: (mutationError) => {
                setError(toFrenchLeagueMessage(mutationError));
            },
        });
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ flex: 1 }}>
            <ScrollView
                className="flex-1 bg-white"
                contentContainerClassName="gap-6 p-6"
                keyboardShouldPersistTaps="handled">
                <Text className="text-base text-gray-500">
                    Entre le code d’invitation reçu de l’organisateur de la ligue.
                </Text>

                {error ? <FormBanner message={error} tone="error" /> : null}

                <View className="gap-4">
                    <FormField
                        label="Code d’invitation"
                        autoCapitalize="characters"
                        autoCorrect={false}
                        placeholder="ABCD2345"
                        value={rawCode}
                        error={fieldError}
                        onChangeText={setRawCode}
                    />
                    <PrimaryButton
                        title="Rejoindre la ligue"
                        loading={joinLeague.isPending}
                        disabled={!rawCode}
                        onPress={onSubmit}
                    />
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}
