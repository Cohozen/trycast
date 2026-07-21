import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { BookOpen, ChevronRight, Globe, KeyRound, Mail } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { SectionLabel } from '@/components/ui/section-label';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Toast } from '@/components/ui/toast';
import { AvatarEditor } from '@/features/profile/components/avatar-editor';
import { DeleteAccountModal } from '@/features/profile/components/delete-account-modal';
import { EmailEditorModal } from '@/features/profile/components/email-editor-modal';
import { PasswordEditorModal } from '@/features/profile/components/password-editor-modal';
import { UsernameEditor } from '@/features/profile/components/username-editor';
import { useSession } from '@/features/auth/session-context';
import { NotificationSettings } from '@/features/notifications/components/notification-settings';
import { unregisterPushToken } from '@/features/notifications/register-push-token';
import { PrivacySettings } from '@/features/privacy/components/privacy-settings';
import {
    type LanguagePreference,
    loadLanguagePreference,
    resolveLanguage,
    setLanguagePreference,
} from '@/features/profile/language-preference';
import {
    loadThemePreference,
    setThemePreference,
    type ThemePreference,
} from '@/features/profile/theme-preference';
import { useDeleteAccount, useProfile } from '@/features/profile/use-profile';
import { supabase } from '@/lib/supabase';
import { Pressable, Text, useThemeColor, View } from '@/tw';

/**
 * Écran Réglages : compte (pseudo, e-mail, mot de passe), thème, langue,
 * notifications, version, déconnexion et zone de danger. Titre et retour
 * portés par le header natif (déclaré dans le layout (app)).
 */
export default function SettingsScreen() {
    const { t } = useTranslation(['profile', 'scoring', 'common']);
    const router = useRouter();
    const { session } = useSession();
    const { data: profile } = useProfile(session?.user.id ?? '');
    const deleteAccount = useDeleteAccount();

    const [theme, setTheme] = useState<ThemePreference>('system');
    const [language, setLanguage] = useState<LanguagePreference>('system');
    const [confirmingDelete, setConfirmingDelete] = useState(false);
    const [editingPassword, setEditingPassword] = useState(false);
    const [passwordSaved, setPasswordSaved] = useState(false);
    const [editingEmail, setEditingEmail] = useState(false);
    const [emailSent, setEmailSent] = useState(false);
    const brandColor = useThemeColor('brand');
    const textFaintColor = useThemeColor('text-faint');

    useEffect(() => {
        loadThemePreference().then(setTheme);
        loadLanguagePreference().then(setLanguage);
    }, []);

    const onThemeChange = (next: ThemePreference) => {
        setTheme(next);
        setThemePreference(next);
    };

    // Persiste + applique la langue, puis pousse la langue résolue dans
    // profiles.locale (les notifications sont localisées côté serveur d'après
    // cette colonne ; useSyncLocale ne se rejoue pas en cours de session).
    const onLanguageChange = (next: LanguagePreference) => {
        setLanguage(next);
        setLanguagePreference(next);
        const userId = session?.user.id;
        if (userId) {
            supabase
                .from('profiles')
                .update({ locale: resolveLanguage(next) })
                .eq('id', userId)
                .then(({ error }) => {
                    if (error && __DEV__) {
                        console.warn('Mise à jour de profiles.locale échouée :', error.message);
                    }
                });
        }
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
        <Screen contentClassName="gap-[22px] px-[18px] pb-10 pt-4" top="none">
            {/* Compte — pseudo, e-mail, mot de passe */}
            <View className="gap-2.5">
                <SectionLabel>{t('profile:settings.sections.account')}</SectionLabel>
                {passwordSaved ? (
                    <Toast message={t('profile:settings.password.updated')} tone="success" />
                ) : null}
                {emailSent ? (
                    <Toast message={t('profile:settings.email.sent')} tone="success" />
                ) : null}
                <AvatarEditor userId={session?.user.id ?? ''} />
                <UsernameEditor userId={session?.user.id ?? ''} />
                <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                        setEmailSent(false);
                        setEditingEmail(true);
                    }}>
                    <Card className="flex-row items-center gap-3 px-4 py-3.5">
                        <View className="h-8 w-8 items-center justify-center rounded-sm bg-brand/10">
                            <Mail color={brandColor} size={17} strokeWidth={1.9} />
                        </View>
                        <Text className="font-body-semibold text-[15px] text-text">
                            {t('profile:settings.email.row')}
                        </Text>
                        <Text
                            className="flex-1 text-right font-body-medium text-[14px] text-text-muted"
                            numberOfLines={1}>
                            {session?.user.email ?? ''}
                        </Text>
                        <ChevronRight color={textFaintColor} size={18} strokeWidth={1.9} />
                    </Card>
                </Pressable>
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
                <Card className="gap-3 px-4 py-3.5">
                    <View className="flex-row items-center gap-3">
                        <View className="h-8 w-8 items-center justify-center rounded-sm bg-brand/10">
                            <Globe color={brandColor} size={17} strokeWidth={1.9} />
                        </View>
                        <Text className="flex-1 font-body-semibold text-[15px] text-text">
                            {t('profile:settings.language.label')}
                        </Text>
                    </View>
                    <SegmentedControl
                        onChange={onLanguageChange}
                        options={[
                            { value: 'system', label: t('profile:settings.language.system') },
                            { value: 'fr', label: t('profile:settings.language.fr') },
                            { value: 'en', label: t('profile:settings.language.en') },
                        ]}
                        value={language}
                    />
                </Card>
            </View>

            {/* Notifications */}
            <View className="gap-2.5">
                <SectionLabel>{t('profile:settings.sections.notifications')}</SectionLabel>
                <NotificationSettings userId={session?.user.id ?? ''} />
            </View>

            {/* Confidentialité (RGPD) */}
            <View className="gap-2.5">
                <SectionLabel>{t('profile:settings.sections.privacy')}</SectionLabel>
                <PrivacySettings userId={session?.user.id ?? ''} />
            </View>

            {/* À propos */}
            <View className="gap-2.5">
                <SectionLabel>{t('profile:settings.sections.about')}</SectionLabel>
                <Pressable accessibilityRole="button" onPress={() => router.push('/rules')}>
                    <Card className="flex-row items-center gap-3 px-4 py-3.5">
                        <View className="h-8 w-8 items-center justify-center rounded-sm bg-brand/10">
                            <BookOpen color={brandColor} size={17} strokeWidth={1.9} />
                        </View>
                        <Text className="flex-1 font-body-semibold text-[15px] text-text">
                            {t('scoring:rules.screenTitle')}
                        </Text>
                        <ChevronRight color={textFaintColor} size={18} strokeWidth={1.9} />
                    </Card>
                </Pressable>
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

            <EmailEditorModal
                currentEmail={session?.user.email ?? ''}
                onClose={() => setEditingEmail(false)}
                onSuccess={() => setEmailSent(true)}
                visible={editingEmail}
            />

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
        </Screen>
    );
}
