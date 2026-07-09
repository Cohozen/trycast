import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform } from 'react-native';

import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { Toast } from '@/components/ui/toast';
import { toLeagueMessageKey } from '@/features/leagues/errors';
import { useJoinLeague } from '@/features/leagues/use-join-league';
import { normalizeInviteCode } from '@/features/leagues/validation';
import { ScrollView, Text, View } from '@/tw';

export default function JoinLeagueScreen() {
    const { t } = useTranslation(['leagues']);
    const router = useRouter();
    const joinLeague = useJoinLeague();
    const [rawCode, setRawCode] = useState('');
    const [fieldError, setFieldError] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const onSubmit = () => {
        setError(null);
        const code = normalizeInviteCode(rawCode);
        if (!code) {
            setFieldError(t('leagues:validation.codeFormat'));
            return;
        }
        setFieldError(null);

        joinLeague.mutate(code, {
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
                    {t('leagues:join.intro')}
                </Text>

                {error ? <Toast message={error} tone="accent" /> : null}

                <View className="gap-4">
                    <TextField
                        autoCapitalize="characters"
                        autoCorrect={false}
                        error={fieldError}
                        label={t('leagues:join.codeLabel')}
                        onChangeText={setRawCode}
                        placeholder={t('leagues:join.codePlaceholder')}
                        value={rawCode}
                    />
                    <Button
                        disabled={!rawCode}
                        fullWidth
                        loading={joinLeague.isPending}
                        onPress={onSubmit}
                        title={t('leagues:join.submit')}
                    />
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}
