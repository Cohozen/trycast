import { useRouter } from 'expo-router';
import { Pencil, Settings } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { IconButton } from '@/components/ui/icon-button';
import { Skeleton } from '@/components/ui/skeleton';
import { TextField } from '@/components/ui/text-field';
import { Toast } from '@/components/ui/toast';
import { useSession } from '@/features/auth/session-context';
import { validateUsername } from '@/features/auth/validation';
import { toProfileMessageKey } from '@/features/profile/errors';
import { useProfile, useUpdateUsername } from '@/features/profile/use-profile';
import { Pressable, ScrollView, Text, useThemeColor, View } from '@/tw';

export default function ProfileScreen() {
    const { t } = useTranslation(['profile', 'auth', 'common']);
    const router = useRouter();
    const { session } = useSession();
    const userId = session?.user.id ?? '';

    const { data: profile, isPending } = useProfile(userId);
    const updateUsername = useUpdateUsername(userId);

    const [editing, setEditing] = useState(false);
    const [username, setUsername] = useState('');
    const [fieldError, setFieldError] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [saved, setSaved] = useState(false);
    const textColor = useThemeColor('text');
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

    return (
        <ScrollView
            className="flex-1 bg-bg"
            contentContainerClassName="w-full max-w-[800px] gap-[18px] self-center px-5 pb-32 pt-14">
            <View className="flex-row items-start justify-between gap-3">
                <Text className="font-display text-[30px] leading-[30px] tracking-[0.3px] text-text">
                    {t('profile:title')}
                </Text>
                <IconButton
                    accessibilityLabel={t('profile:settings.title')}
                    onPress={() => router.push('/settings')}
                    variant="soft">
                    <Settings color={textColor} size={20} strokeWidth={1.9} />
                </IconButton>
            </View>

            {error ? <Toast message={error} tone="accent" /> : null}
            {saved ? <Toast message={t('profile:username.updated')} tone="success" /> : null}

            {isPending ? (
                <Skeleton className="h-[88px]" variant="block" />
            ) : (
                <Card className="flex-row items-center gap-3.5 px-4 py-3.5">
                    <Avatar name={profile?.username ?? '?'} ring size="lg" />
                    <View className="min-w-0 flex-1 gap-0.5">
                        <Text className="font-body-bold text-[16px] text-text">
                            {profile?.username}
                        </Text>
                        <Text className="font-body text-[13px] text-text-muted" numberOfLines={1}>
                            {session?.user.email}
                        </Text>
                    </View>
                </Card>
            )}

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
                <Pressable onPress={startEditing}>
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
        </ScrollView>
    );
}
