import { Pencil } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TextField } from '@/components/ui/text-field';
import { Toast } from '@/components/ui/toast';
import { validateUsername } from '@/features/auth/validation';
import { toProfileMessageKey } from '@/features/profile/errors';
import { useProfile, useUpdateUsername } from '@/features/profile/use-profile';
import { Pressable, Text, useThemeColor, View } from '@/tw';

type UsernameEditorProps = {
    userId: string;
};

/**
 * Rangée « Pseudo » de la carte Compte des Réglages (maquette Reglages) :
 * affichage → édition inline (champ + règles + Annuler/Enregistrer).
 */
export function UsernameEditor({ userId }: UsernameEditorProps) {
    const { t } = useTranslation(['profile', 'auth', 'common']);
    const { data: profile, isPending } = useProfile(userId);
    const updateUsername = useUpdateUsername(userId);

    const [editing, setEditing] = useState(false);
    const [username, setUsername] = useState('');
    const [fieldError, setFieldError] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [saved, setSaved] = useState(false);
    const textFaintColor = useThemeColor('text-faint');

    const startEditing = () => {
        setUsername(profile?.username ?? '');
        setFieldError(null);
        setError(null);
        setSaved(false);
        setEditing(true);
    };

    const onSave = async () => {
        setError(null);
        const validationError = validateUsername(username);
        if (validationError) {
            setFieldError(t(validationError));
            return;
        }
        setFieldError(null);
        try {
            await updateUsername.mutateAsync(username);
            setEditing(false);
            setSaved(true);
        } catch (err) {
            const key = toProfileMessageKey(err);
            if (key === 'common:errors.generic') {
                setError(t(key));
            } else {
                setFieldError(t(key));
            }
        }
    };

    if (isPending) {
        return <Skeleton className="h-[68px]" variant="block" />;
    }

    return (
        <View className="gap-2.5">
            {error ? <Toast message={error} tone="accent" /> : null}
            {saved ? <Toast message={t('profile:username.updated')} tone="success" /> : null}

            {editing ? (
                <Card className="gap-2.5 px-4 py-3.5">
                    <TextField
                        autoCapitalize="none"
                        autoCorrect={false}
                        error={fieldError}
                        label={t('profile:username.label')}
                        onChangeText={setUsername}
                        value={username}
                    />
                    <Text className="font-body text-[11.5px] leading-[16px] text-text-faint">
                        {t('profile:username.hint')}
                    </Text>
                    <View className="flex-row justify-end gap-2">
                        <Button
                            onPress={() => setEditing(false)}
                            size="sm"
                            title={t('common:actions.cancel')}
                            variant="ghost"
                        />
                        <Button
                            disabled={!username || username === profile?.username}
                            loading={updateUsername.isPending}
                            onPress={onSave}
                            size="sm"
                            title={t('common:actions.save')}
                        />
                    </View>
                </Card>
            ) : (
                <Pressable accessibilityRole="button" onPress={startEditing}>
                    <Card className="flex-row items-center gap-3 px-4 py-3.5">
                        <View className="min-w-0 flex-1 gap-0.5">
                            <Text className="font-body-bold text-[11px] uppercase tracking-[0.55px] text-text-faint">
                                {t('profile:username.label')}
                            </Text>
                            <Text className="font-body-bold text-[15.5px] text-text">
                                {profile?.username}
                            </Text>
                        </View>
                        <Pencil color={textFaintColor} size={17} strokeWidth={1.9} />
                    </Card>
                </Pressable>
            )}
        </View>
    );
}
