import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform } from 'react-native';

import { FormBanner, FormField, PrimaryButton } from '@/components/form';
import { toFrenchLeagueMessage } from '@/features/leagues/errors';
import { useCreateLeague } from '@/features/leagues/use-create-league';
import { validateLeagueName } from '@/features/leagues/validation';
import { ScrollView, Text, View } from '@/tw';

export default function CreateLeagueScreen() {
    const router = useRouter();
    const createLeague = useCreateLeague();
    const [name, setName] = useState('');
    const [fieldError, setFieldError] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const onSubmit = () => {
        setError(null);
        const nameError = validateLeagueName(name);
        setFieldError(nameError);
        if (nameError) return;

        createLeague.mutate(name.trim(), {
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
                    Donne un nom à ta ligue — tu recevras un code d’invitation à partager
                    avec tes amis.
                </Text>

                {error ? <FormBanner message={error} tone="error" /> : null}

                <View className="gap-4">
                    <FormField
                        label="Nom de la ligue"
                        placeholder="Les copains du rugby"
                        value={name}
                        error={fieldError}
                        onChangeText={setName}
                    />
                    <PrimaryButton
                        title="Créer la ligue"
                        loading={createLeague.isPending}
                        disabled={!name}
                        onPress={onSubmit}
                    />
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}
