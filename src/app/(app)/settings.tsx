import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { ChevronLeft, ChevronRight, Globe, KeyRound } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Toast } from '@/components/ui/toast';
import { AvatarEditor } from '@/features/profile/components/avatar-editor';
import { DeleteAccountModal } from '@/features/profile/components/delete-account-modal';
import { PasswordEditorModal } from '@/features/profile/components/password-editor-modal';
import { UsernameEditor } from '@/features/profile/components/username-editor';
import { useSession } from '@/features/auth/session-context';
import { NotificationSettings } from '@/features/notifications/components/notification-settings';
import { unregisterPushToken } from '@/features/notifications/register-push-token';
import {
    loadThemePreference,
    setThemePreference,
    type ThemePreference,
} from '@/features/profile/theme-preference';
import { useDeleteAccount, useProfile } from '@/features/profile/use-profile';
import { supabase } from '@/lib/supabase';
import { Pressable, ScrollView, Text, useThemeColor, View } from '@/tw';
import { useScreenInsets } from '@/tw/use-screen-insets';

function SectionLabel({ children, danger = false }: { children: string; danger?: boolean }) {
    return (
        <Text
            className={
                danger
                    ? 'px-1.5 font-body-bold text-[11px] uppercase tracking-[1px] text-danger'
                    : 'px-1.5 font-body-bold text-[11px] uppercase tracking-[1px] text-text-faint'
            }>
            {children}
        </Text>
    );
}

/**
 * Écran Réglages : compte (pseudo + mot de passe), thème, langue affichée,
 * notifications, version, déconnexion et zone de danger. Photo, e-mail et
 * RGPD arrivent avec leurs lots.
 */
export default function SettingsScreen() {
    const { t } = useTranslation(['profile', 'common']);
    const router = useRouter();
    const { session } = useSession();
    const { data: profile } = useProfile(session?.user.id ?? '');
    const deleteAccount = useDeleteAccount();

    const [theme, setTheme] = useState<ThemePreference>('system');
    const [confirmingDelete, setConfirmingDelete] = useState(false);
    const [editingPassword, setEditingPassword] = useState(false);
    const [passwordSaved, setPasswordSaved] = useState(false);
    const textColor = useThemeColor('text');
    const brandColor = useThemeColor('brand');
    const textFaintColor = useThemeColor('text-faint');
    const screenInsets = useScreenInsets();

    useEffect(() => {
        loadThemePreference().then(setTheme);
    }, []);

    const onThemeChange = (next: ThemePreference) => {
        setTheme(next);
        setThemePreference(next);
    };

    // Le token push part AVANT la session (après signOut, plus de droits pour
    // la RPC — et le compte suivant sur ce téléphone ne doit pas recevoir les
    // push de celui-ci)
    const onLogout = async () => {
        await unregisterPushToken();
        await supabase.auth.signOut();
    };

    const onConfirmDelete = async () => {
        try {
            await deleteAccount.mutateAsync();
            // signOut inclus dans la mutation : Stack.Protected renvoie sur (auth)
        } catch {
            setConfirmingDelete(false);
        }
    };

    return (
        <ScrollView
            className="flex-1 bg-bg"
            contentContainerClassName="w-full max-w-[800px] gap-[22px] self-center px-[18px] pb-10"
            contentContainerStyle={{ paddingTop: screenInsets.top }}>
            <View className="flex-row items-center gap-2.5">
                <IconButton
                    accessibilityLabel={t('common:actions.back')}
                    onPress={() => router.back()}>
                    <ChevronLeft color={textColor} size={22} strokeWidth={2.1} />
                </IconButton>
                <Text className="font-display text-[30px] leading-[30px] tracking-[0.3px] text-text">
                    {t('profile:settings.title')}
                </Text>
            </View>

            {/* Compte — pseudo + mot de passe (e-mail arrive avec le Lot 7) */}
            <View className="gap-2.5">
                <SectionLabel>{t('profile:settings.sections.account')}</SectionLabel>
                {passwordSaved ? (
                    <Toast message={t('profile:settings.password.updated')} tone="success" />
                ) : null}
                <AvatarEditor userId={session?.user.id ?? ''} />
                <UsernameEditor userId={session?.user.id ?? ''} />
                <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                        setPasswordSaved(false);
                        setEditingPassword(true);
                    }}>
                    <Card className="flex-row items-center gap-3 px-4 py-3.5">
                        <View className="h-8 w-8 items-center justify-center rounded-sm bg-brand/10">
                            <KeyRound color={brandColor} size={17} strokeWidth={1.9} />
                        </View>
                        <Text className="flex-1 font-body-semibold text-[15px] text-text">
                            {t('profile:settings.password.row')}
                        </Text>
                        <Text className="font-body-medium text-[14px] text-text-muted">
                            {t('profile:settings.password.rowValue')}
                        </Text>
                        <ChevronRight color={textFaintColor} size={18} strokeWidth={1.9} />
                    </Card>
                </Pressable>
            </View>

            {/* Préférences */}
            <View className="gap-2.5">
                <SectionLabel>{t('profile:settings.sections.preferences')}</SectionLabel>
                <Card className="gap-3 px-4 py-3.5">
                    <View className="flex-row items-center justify-between gap-2">
                        <Text className="font-body-semibold text-[15px] text-text">
                            {t('profile:settings.theme.label')}
                        </Text>
                        <Text className="font-body-semibold text-[11px] text-text-faint">
                            {t('profile:settings.theme.autoSaved')}
                        </Text>
                    </View>
                    <SegmentedControl
                        onChange={onThemeChange}
                        options={[
                            { value: 'system', label: t('profile:settings.theme.system') },
                            { value: 'light', label: t('profile:settings.theme.light') },
                            { value: 'dark', label: t('profile:settings.theme.dark') },
                        ]}
                        value={theme}
                    />
                </Card>
                <Card className="flex-row items-center gap-3 px-4 py-3.5">
                    <View className="h-8 w-8 items-center justify-center rounded-sm bg-brand/10">
                        <Globe color={brandColor} size={17} strokeWidth={1.9} />
                    </View>
                    <Text className="flex-1 font-body-semibold text-[15px] text-text">
                        {t('profile:settings.language.label')}
                    </Text>
                    <Text className="font-body-medium text-[14px] text-text-muted">
                        {t('profile:settings.language.current')}
                    </Text>
                </Card>
            </View>

            {/* Notifications */}
            <View className="gap-2.5">
                <SectionLabel>{t('profile:settings.sections.notifications')}</SectionLabel>
                <NotificationSettings userId={session?.user.id ?? ''} />
            </View>

            {/* À propos */}
            <View className="gap-2.5">
                <SectionLabel>{t('profile:settings.sections.about')}</SectionLabel>
                <Card className="flex-row items-center gap-3 px-4 py-3.5">
                    <Text className="flex-1 font-body-semibold text-[15px] text-text">
                        {t('profile:settings.version')}
                    </Text>
                    <Text className="font-body-medium text-[14px] text-text-muted">
                        {Constants.expoConfig?.version ?? '?'}
                    </Text>
                </Card>
                <View className="mt-1">
                    <Button
                        fullWidth
                        onPress={onLogout}
                        title={t('profile:settings.logout')}
                        variant="secondary"
                    />
                </View>
            </View>

            {/* Zone de danger */}
            <View className="mt-1.5 gap-2.5 border-t border-dashed border-border-strong pt-5">
                <SectionLabel danger>{t('profile:settings.sections.danger')}</SectionLabel>
                <View className="gap-3 rounded-md border border-danger/30 bg-danger/5 p-4">
                    <View className="gap-1">
                        <Text className="font-body-bold text-[15px] text-text">
                            {t('profile:settings.delete.rowTitle')}
                        </Text>
                        <Text className="font-body text-[12.5px] leading-[18px] text-text-muted">
                            {t('profile:settings.delete.rowSubtitle')}
                        </Text>
                    </View>
                    <Button
                        fullWidth
                        onPress={() => setConfirmingDelete(true)}
                        title={t('profile:settings.delete.rowTitle')}
                        variant="danger-outline"
                    />
                </View>
            </View>

            <PasswordEditorModal
                onClose={() => setEditingPassword(false)}
                onSuccess={() => setPasswordSaved(true)}
                visible={editingPassword}
            />

            <DeleteAccountModal
                deleting={deleteAccount.isPending}
                onCancel={() => setConfirmingDelete(false)}
                onConfirm={onConfirmDelete}
                username={profile?.username ?? ''}
                visible={confirmingDelete}
            />
        </ScrollView>
    );
}
