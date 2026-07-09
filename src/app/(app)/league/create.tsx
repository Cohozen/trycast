import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform } from 'react-native';

import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { Toast } from '@/components/ui/toast';
import { toLeagueMessageKey } from '@/features/leagues/errors';
import { useCreateLeague } from '@/features/leagues/use-create-league';
import { validateLeagueName } from '@/features/leagues/validation';
import { ScrollView, Text, View } from '@/tw';

export default function CreateLeagueScreen() {
    const { t } = useTranslation(['leagues']);
    const router = useRouter();
    const createLeague = useCreateLeague();
    const [name, setName] = useState('');
    const [fieldError, setFieldError] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const onSubmit = () => {
        setError(null);
        const nameError = validateLeagueName(name);
        setFieldError(nameError && t(nameError));
        if (nameError) return;

        createLeague.mutate(name.trim(), {
            onSuccess: (league) => {
                router.replace({ pathname: '/league/[id]', params: { id: league.id } });
            },
            onError: (mutationError) => {
                setError(t(toLeagueMessageKey(mutationError)));
            },
        });
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ flex: 1 }}>
            <ScrollView
                className="flex-1 bg-bg"
                contentContainerClassName="w-full max-w-[800px] gap-5 self-center p-6"
                keyboardShouldPersistTaps="handled">
                <Text className="font-body text-body text-text-muted">
                    {t('leagues:create.intro')}
                </Text>

                {error ? <Toast message={error} tone="accent" /> : null}

                <View className="gap-4">
                    <TextField
                        error={fieldError}
                        label={t('leagues:create.nameLabel')}
                        onChangeText={setName}
                        placeholder={t('leagues:create.namePlaceholder')}
                        value={name}
                    />
                    <Button
                        disabled={!name}
                        fullWidth
                        loading={createLeague.isPending}
                        onPress={onSubmit}
                        title={t('leagues:create.submit')}
                    />
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}
