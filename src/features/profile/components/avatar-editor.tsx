import { Camera } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Toast } from '@/components/ui/toast';
import {
    toAvatarMessageKey,
    useRemoveAvatar,
    useUpdateAvatar,
} from '@/features/profile/use-avatar';
import { useProfile } from '@/features/profile/use-profile';
import { Text, useThemeColor, View } from '@/tw';

type AvatarEditorProps = {
    userId: string;
};

/**
 * Rangée « Photo de profil » de la carte Compte des Réglages (maquette) :
 * avatar courant + boutons Changer / Supprimer. La sélection et la compression
 * se font côté client (cf. use-avatar) ; « Supprimer » n'apparaît qu'avec une
 * photo.
 */
export function AvatarEditor({ userId }: AvatarEditorProps) {
    const { t } = useTranslation(['profile', 'common']);
    const { data: profile, isPending } = useProfile(userId);
    const updateAvatar = useUpdateAvatar(userId);
    const removeAvatar = useRemoveAvatar(userId);

    const [error, setError] = useState<string | null>(null);
    const brandColor = useThemeColor('brand');

    const busy = updateAvatar.isPending || removeAvatar.isPending;

    const onChange = async () => {
        setError(null);
        try {
            await updateAvatar.mutateAsync();
        } catch (err) {
            setError(t(toAvatarMessageKey(err)));
        }
    };

    const onRemove = async () => {
        setError(null);
        try {
            await removeAvatar.mutateAsync();
        } catch {
            setError(t('common:errors.generic'));
        }
    };

    if (isPending) {
        return <Skeleton className="h-[84px]" variant="block" />;
    }

    return (
        <View className="gap-2.5">
            {error ? <Toast message={error} tone="accent" /> : null}
            <Card className="flex-row items-center gap-3.5 px-4 py-3.5">
                <Avatar name={profile?.username ?? '?'} ring size="lg" uri={profile?.avatar_url} />
                <View className="min-w-0 flex-1 gap-2">
                    <Text className="font-body-bold text-[11px] uppercase tracking-[0.55px] text-text-faint">
                        {t('profile:settings.avatar.label')}
                    </Text>
                    <View className="flex-row flex-wrap gap-2">
                        <Button
                            disabled={busy}
                            leadingIcon={<Camera color={brandColor} size={14} strokeWidth={2} />}
                            loading={updateAvatar.isPending}
                            onPress={onChange}
                            size="sm"
                            title={t('profile:settings.avatar.change')}
                            variant="secondary"
                        />
                        {profile?.avatar_url ? (
                            <Button
                                disabled={busy}
                                loading={removeAvatar.isPending}
                                onPress={onRemove}
                                size="sm"
                                title={t('profile:settings.avatar.remove')}
                                variant="ghost"
                            />
                        ) : null}
                    </View>
                </View>
            </Card>
        </View>
    );
}
