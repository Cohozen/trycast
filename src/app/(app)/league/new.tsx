import * as Clipboard from 'expo-clipboard';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Check, ClipboardPaste, Copy, Info, Link2, Lock, Share2 } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Share } from 'react-native';

import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { TextField } from '@/components/ui/text-field';
import { Toast } from '@/components/ui/toast';
import { useToast } from '@/components/ui/toast-provider';
import { DEFAULT_LEAGUE_COLOR, type LeagueColor } from '@/features/leagues/colors';
import { InviteCodeInput } from '@/features/leagues/components/invite-code-input';
import { LeagueColorPicker } from '@/features/leagues/components/league-color-picker';
import { LeagueIcon } from '@/features/leagues/components/league-icon';
import { LeaguePreviewSheet } from '@/features/leagues/components/league-preview-sheet';
import { toLeagueMessageKey } from '@/features/leagues/errors';
import type { LeagueRow } from '@/features/leagues/types';
import { useCreateLeague } from '@/features/leagues/use-create-league';
import { useJoinLeague } from '@/features/leagues/use-join-league';
import { useLeaguePreview } from '@/features/leagues/use-league-preview';
import { extractInviteCode, validateLeagueName } from '@/features/leagues/validation';
import { hapticLight } from '@/lib/haptics';
import { Pressable, Text, useThemeColor, View } from '@/tw';

type NewLeagueTab = 'create' | 'join';

/**
 * Créer ou rejoindre une ligue (maquette « Créer Rejoindre Ligue ») : un seul
 * écran, bascule segmentée. Créer enchaîne formulaire → succès in-screen avec
 * le code à partager ; Rejoindre passe par l'aperçu (sheet) avant toute
 * adhésion.
 */
export default function NewLeagueScreen() {
    const { t } = useTranslation(['leagues', 'common']);
    const params = useLocalSearchParams<{ tab?: string }>();
    const [tab, setTab] = useState<NewLeagueTab>(params.tab === 'join' ? 'join' : 'create');

    // Le titre du header natif suit l'onglet (surcharge l'option statique du
    // layout) ; il remplace l'ancien grand titre in-screen, devenu redondant.
    const title = tab === 'create' ? t('leagues:new.createTitle') : t('leagues:new.joinTitle');

    return (
        <Screen contentClassName="gap-5 p-6" top="none">
            <Stack.Screen options={{ title }} />
            <SegmentedControl
                onChange={setTab}
                options={[
                    { value: 'create', label: t('leagues:new.tabs.create') },
                    { value: 'join', label: t('leagues:new.tabs.join') },
                ]}
                value={tab}
            />
            {tab === 'create' ? <CreateSection /> : <JoinSection />}
        </Screen>
    );
}

function CreateSection() {
    const { t } = useTranslation(['leagues', 'common']);
    const createLeague = useCreateLeague();
    const [name, setName] = useState('');
    const [color, setColor] = useState<LeagueColor>(DEFAULT_LEAGUE_COLOR);
    const [fieldError, setFieldError] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [created, setCreated] = useState<LeagueRow | null>(null);
    const mutedColor = useThemeColor('text-muted');

    const onSubmit = () => {
        setError(null);
        const nameError = validateLeagueName(name);
        setFieldError(nameError && t(nameError));
        if (nameError) return;

        createLeague.mutate(
            { name: name.trim(), color },
            {
                onSuccess: setCreated,
                onError: (mutationError) => {
                    setError(t(toLeagueMessageKey(mutationError)));
                },
            },
        );
    };

    if (created) {
        return <CreateSuccess league={created} />;
    }

    return (
        <View className="gap-6">
            {error ? <Toast message={error} tone="accent" /> : null}

            {/* Aperçu vivant : initiales + couleur choisies */}
            <View className="items-center gap-3">
                <LeagueIcon color={color} name={name} size="lg" />
                {name.trim() === '' ? (
                    <Text className="font-body-semibold text-[13px] text-text-muted">
                        {t('leagues:create.namePreview')}
                    </Text>
                ) : null}
            </View>

            <TextField
                error={fieldError}
                helper={fieldError ? undefined : t('leagues:create.nameHelper')}
                label={t('leagues:create.nameLabel')}
                onChangeText={setName}
                placeholder={t('leagues:create.namePlaceholder')}
                value={name}
            />

            <View className="gap-2.5">
                <Text className="font-body-bold text-[11px] uppercase tracking-[0.99px] text-text-faint">
                    {t('leagues:create.colorLabel')}
                </Text>
                <LeagueColorPicker onChange={setColor} value={color} />
                <Text className="font-body text-[12px] text-text-faint">
                    {t('leagues:create.colorHint')}
                </Text>
            </View>

            <View className="flex-row items-start gap-2.5 rounded-sm bg-surface-sunken px-3.5 py-3">
                <Lock color={mutedColor} size={16} strokeWidth={2} />
                <Text className="flex-1 font-body text-[12.5px] leading-[18px] text-text-muted">
                    {t('leagues:create.privacyNote')}
                </Text>
            </View>

            <Button
                disabled={name.trim() === ''}
                fullWidth
                loading={createLeague.isPending}
                onPress={onSubmit}
                title={t('leagues:create.submit')}
            />
        </View>
    );
}

function CreateSuccess({ league }: { league: LeagueRow }) {
    const { t } = useTranslation(['leagues', 'common']);
    const router = useRouter();
    const toast = useToast();
    const successColor = useThemeColor('success');
    const onBrandColor = useThemeColor('on-brand');
    const textColor = useThemeColor('text');

    const copyCode = async () => {
        await Clipboard.setStringAsync(league.invite_code);
        hapticLight();
        toast.show(t('leagues:detail.codeCopied', { code: league.invite_code }), 'success');
    };
    const shareCode = () => {
        Share.share({
            message: t('leagues:detail.shareMessage', {
                name: league.name,
                code: league.invite_code,
            }),
        });
    };

    return (
        <View className="gap-6 pt-2">
            <View className="items-center gap-3">
                <View className="h-[60px] w-[60px] items-center justify-center rounded-pill bg-success/15">
                    <Check color={successColor} size={30} strokeWidth={2.4} />
                </View>
                <Text className="text-center font-display text-[27px] leading-[29px] text-text">
                    {t('leagues:create.success.title')}
                </Text>
                <Text className="max-w-[280px] text-center font-body text-[13.5px] leading-[20px] text-text-muted">
                    {t('leagues:create.success.message', { name: league.name })}
                </Text>
            </View>

            <View className="items-center gap-3.5 rounded-md border border-border bg-surface px-4 py-5 tc-shadow-sm">
                <Text className="font-body-bold text-[11px] uppercase tracking-[0.88px] text-text-faint">
                    {t('leagues:create.success.codeLabel')}
                </Text>
                <Text className="pl-[6px] font-display text-[40px] leading-[42px] tracking-[6px] text-text">
                    {league.invite_code}
                </Text>
                <View className="w-full flex-row gap-2.5">
                    <View className="flex-1">
                        <Button
                            fullWidth
                            leadingIcon={<Copy color={onBrandColor} size={16} strokeWidth={2} />}
                            onPress={copyCode}
                            title={t('common:actions.copy')}
                            variant="brand"
                        />
                    </View>
                    <View className="flex-1">
                        <Button
                            fullWidth
                            leadingIcon={<Share2 color={textColor} size={16} strokeWidth={2} />}
                            onPress={shareCode}
                            title={t('common:actions.share')}
                            variant="secondary"
                        />
                    </View>
                </View>
            </View>

            <View className="gap-2.5">
                <Button
                    fullWidth
                    onPress={() =>
                        router.replace({ pathname: '/league/[id]', params: { id: league.id } })
                    }
                    title={t('leagues:create.success.open')}
                />
                <Text className="text-center font-body text-[12px] text-text-faint">
                    {t('leagues:create.success.reinvite')}
                </Text>
            </View>
        </View>
    );
}

function JoinSection() {
    const { t } = useTranslation(['leagues', 'common']);
    const router = useRouter();
    const joinLeague = useJoinLeague();
    const [value, setValue] = useState('');
    const [linkDetected, setLinkDetected] = useState(false);
    const [pasteError, setPasteError] = useState<string | null>(null);
    // La sheet se rouvre à chaque nouveau code complet ; « Annuler » la
    // referme sans effacer la saisie.
    const [dismissed, setDismissed] = useState(false);
    const mutedColor = useThemeColor('text-muted');
    const faintColor = useThemeColor('text-faint');
    const brandColor = useThemeColor('brand');
    const dangerColor = useThemeColor('danger');

    const code = value.length === 8 ? value : null;
    const preview = useLeaguePreview(code);
    const joinError = joinLeague.error ?? preview.error;

    const onChange = (next: string) => {
        setValue(next);
        setLinkDetected(false);
        setPasteError(null);
        setDismissed(false);
        joinLeague.reset();
    };

    const pasteFromClipboard = async () => {
        const text = await Clipboard.getStringAsync();
        const extracted = extractInviteCode(text);
        if (extracted) {
            onChange(extracted);
            setLinkDetected(true);
        } else {
            setPasteError(t('leagues:join.pasteEmpty'));
        }
    };

    const openLeague = (id: string) => {
        router.replace({ pathname: '/league/[id]', params: { id } });
    };

    return (
        <View className="gap-5 pt-1">
            <View className="items-center gap-2.5">
                <View className="h-[60px] w-[60px] items-center justify-center rounded-pill bg-surface-sunken">
                    <ClipboardPaste color={mutedColor} size={28} strokeWidth={1.8} />
                </View>
                <Text className="max-w-[280px] text-center font-body text-[13.5px] leading-[20px] text-text-muted">
                    {t('leagues:join.intro')}
                </Text>
            </View>

            <View className="gap-2.5">
                <Text className="text-center font-body-bold text-[11px] uppercase tracking-[0.99px] text-text-faint">
                    {t('leagues:join.codeLabel')}
                </Text>
                <InviteCodeInput error={!!preview.error} onChange={onChange} value={value} />
                {joinError ? (
                    <View className="flex-row items-center justify-center gap-1.5 pt-1">
                        <Info color={dangerColor} size={15} strokeWidth={2} />
                        <Text className="font-body-semibold text-[12.5px] text-danger">
                            {t(toLeagueMessageKey(joinError))}
                        </Text>
                    </View>
                ) : null}
                {pasteError ? (
                    <View className="flex-row items-center justify-center gap-1.5 pt-1">
                        <Info color={dangerColor} size={15} strokeWidth={2} />
                        <Text className="font-body-semibold text-[12.5px] text-danger">
                            {pasteError}
                        </Text>
                    </View>
                ) : null}
                {linkDetected && !joinError ? (
                    <View className="flex-row items-center justify-center gap-1.5 pt-1">
                        <Link2 color={brandColor} size={15} strokeWidth={2} />
                        <Text className="font-body-semibold text-[12.5px] text-brand">
                            {t('leagues:join.linkDetected')}
                        </Text>
                    </View>
                ) : null}
            </View>

            <Pressable
                accessibilityRole="button"
                className="h-[46px] flex-row items-center justify-center gap-2 rounded-pill border border-dashed border-border-strong"
                onPress={pasteFromClipboard}>
                <ClipboardPaste color={mutedColor} size={16} strokeWidth={2} />
                <Text className="font-body-semibold text-[13.5px] text-text-muted">
                    {t('leagues:join.paste')}
                </Text>
            </Pressable>

            <View className="flex-row items-start gap-2 px-1">
                <Info color={faintColor} size={14} strokeWidth={1.8} />
                <Text className="flex-1 font-body text-[12px] leading-[17px] text-text-faint">
                    {t('leagues:join.hint')}
                </Text>
            </View>

            <LeaguePreviewSheet
                joining={joinLeague.isPending}
                onCancel={() => setDismissed(true)}
                onJoin={() => {
                    if (!code) return;
                    joinLeague.mutate(code, {
                        onSuccess: (league) => openLeague(league.id),
                    });
                }}
                onOpen={() => preview.data && openLeague(preview.data.league_id)}
                preview={preview.data ?? null}
                visible={!!preview.data && !dismissed}
            />
        </View>
    );
}
