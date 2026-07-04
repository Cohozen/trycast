import { useState } from 'react';
import { Alert } from 'react-native';

import { FormBanner, FormField, PrimaryButton } from '@/components/form';
import { toFrenchAuthMessage } from '@/features/auth/errors';
import { useSession } from '@/features/auth/session-context';
import { validateUsername } from '@/features/auth/validation';
import { useDeleteAccount, useProfile, useUpdateUsername } from '@/features/profile/use-profile';
import { supabase } from '@/lib/supabase';
import { ActivityIndicator, ScrollView, Text, View } from '@/tw';

export default function ProfileScreen() {
    const { session } = useSession();
    const userId = session?.user.id ?? '';

    const { data: profile, isPending } = useProfile(userId);
    const updateUsername = useUpdateUsername(userId);
    const deleteAccount = useDeleteAccount();

    const [username, setUsername] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [saved, setSaved] = useState(false);

    const editedUsername = username ?? profile?.username ?? '';
    const isDirty = profile != null && editedUsername !== profile.username;

    const onSave = async () => {
        setError(null);
        setSaved(false);
        const validationError = validateUsername(editedUsername);
        if (validationError) {
            setError(validationError);
            return;
        }
        try {
            await updateUsername.mutateAsync(editedUsername);
            setUsername(null);
            setSaved(true);
        } catch (err) {
            if (isPostgrestError(err) && err.code === '23505') {
                setError('Ce pseudo est déjà pris.');
            } else {
                setError(toFrenchAuthMessage(err));
            }
        }
    };

    const onDeleteAccount = () => {
        Alert.alert(
            'Supprimer ton compte ?',
            'Toutes tes données (profil, pronostics, ligues) seront définitivement supprimées. Cette action est irréversible.',
            [
                { text: 'Annuler', style: 'cancel' },
                {
                    text: 'Supprimer',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteAccount.mutateAsync();
                            // signOut inclus dans la mutation : Stack.Protected renvoie sur (auth)
                        } catch (err) {
                            Alert.alert('Erreur', toFrenchAuthMessage(err));
                        }
                    },
                },
            ],
        );
    };

    if (isPending) {
        return (
            <View className="flex-1 items-center justify-center">
                <ActivityIndicator />
            </View>
        );
    }

    return (
        <ScrollView className="flex-1" contentContainerClassName="gap-8 p-6 pt-16">
            <View className="gap-1">
                <Text className="text-2xl font-bold text-gray-900">Mon profil</Text>
                <Text className="text-base text-gray-500">{session?.user.email}</Text>
            </View>

            {error ? <FormBanner message={error} tone="error" /> : null}
            {saved ? <FormBanner message="Pseudo mis à jour !" tone="success" /> : null}

            <View className="gap-4">
                <FormField
                    label="Pseudo"
                    autoCapitalize="none"
                    autoCorrect={false}
                    value={editedUsername}
                    onChangeText={(value) => {
                        setUsername(value);
                        setSaved(false);
                    }}
                />
                {isDirty ? (
                    <PrimaryButton
                        title="Enregistrer"
                        loading={updateUsername.isPending}
                        onPress={onSave}
                    />
                ) : null}
            </View>

            <View className="gap-3">
                <PrimaryButton title="Se déconnecter" onPress={() => supabase.auth.signOut()} />
            </View>

            <View className="gap-3 rounded-2xl border border-red-200 bg-red-50/50 p-4">
                <Text className="text-base font-semibold text-red-700">Zone danger</Text>
                <Text className="text-sm text-gray-600">
                    La suppression de ton compte est immédiate et irréversible.
                </Text>
                <PrimaryButton
                    title="Supprimer mon compte"
                    variant="danger"
                    loading={deleteAccount.isPending}
                    onPress={onDeleteAccount}
                />
            </View>
        </ScrollView>
    );
}

function isPostgrestError(err: unknown): err is { code: string } {
    return typeof err === 'object' && err !== null && 'code' in err;
}
