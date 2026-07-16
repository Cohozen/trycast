import * as Clipboard from 'expo-clipboard';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import {
    ArrowLeftRight,
    ChevronRight,
    Clock,
    Copy,
    Info,
    Share2,
    TriangleAlert,
    UserPlus,
    Users,
    UserX,
} from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Share } from 'react-native';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Skeleton } from '@/components/ui/skeleton';
import { Toast } from '@/components/ui/toast';
import { useSession } from '@/features/auth/session-context';
import { DeleteLeagueModal } from '@/features/leagues/components/delete-league-modal';
import { LeaderboardRow } from '@/features/leagues/components/leaderboard-row';
import { LeagueIcon } from '@/features/leagues/components/league-icon';
import { LeaveLeagueModal } from '@/features/leagues/components/leave-league-modal';
import { Podium } from '@/features/leagues/components/podium';
import { RemoveMemberModal } from '@/features/leagues/components/remove-member-modal';
import { RoundStandingRow } from '@/features/leagues/components/round-standing-row';
import { RoundStrip, type RoundStripItem } from '@/features/leagues/components/round-strip';
import { TransferOwnershipModal } from '@/features/leagues/components/transfer-ownership-modal';
import { Avatar } from '@/components/ui/avatar';
import { markTies } from '@/features/leagues/ranking';
import { groupRoundPoints } from '@/features/leagues/round-points';
import type { LeaderboardEntry } from '@/features/leagues/types';
import { useDeleteLeague } from '@/features/leagues/use-delete-league';
import { useKickMember } from '@/features/leagues/use-kick-member';
import { useLeagueLeaderboard } from '@/features/leagues/use-league-leaderboard';
import { useLeagueRoundPoints } from '@/features/leagues/use-league-round-points';
import { useLeaveLeague } from '@/features/leagues/use-leave-league';
import { useMyLeagues } from '@/features/leagues/use-my-leagues';
import { useTransferOwnership } from '@/features/leagues/use-transfer-ownership';
import type { MatchWithTeams } from '@/features/matches/types';
import { useMatches } from '@/features/matches/use-matches';
import { i18n } from '@/lib/i18n';
import { Pressable, ScrollView, Text, useThemeColor, View } from '@/tw';
import { cn } from '@/tw/variants';

type DetailTab = 'standings' | 'results' | 'settings';

/** Clé de strip pour un round nullable (aligné sur le graphe du Profil). */
const roundKeyOf = (round: string | null) => round ?? 'sans-round';

/**
 * Détail d'une ligue (maquette « Détail Ligue ») : identité + trois onglets —
 * Classement (podium + table, invitation mise en avant à 1 membre), Résultats
 * (points par journée), Réglages (invitation, gestion des membres pour
 * l'admin, zone danger : quitter / transférer / supprimer).
 */
export default function LeagueScreen() {
    const { t } = useTranslation(['leagues', 'common']);
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const { session } = useSession();
    const userId = session?.user.id;

    const [tab, setTab] = useState<DetailTab>('standings');

    const leagues = useMyLeagues();
    const leaderboard = useLeagueLeaderboard(id);
    const league = leagues.data?.find((row) => row.id === id);
    const isOwner = !!league && league.owner_id === userId;

    if (leagues.isPending || leaderboard.isPending) {
        return (
            <View className="flex-1 gap-2.5 bg-bg p-6">
                <View className="flex-row items-center gap-3.5">
                    <Skeleton className="h-[58px] w-[58px]" variant="block" />
                    <View className="flex-1 gap-2">
                        <Skeleton className="h-6 w-40" variant="line" />
                        <Skeleton className="h-3.5 w-24" variant="line" />
                    </View>
                </View>
                <Skeleton className="h-12" variant="block" />
                <Skeleton className="h-16" variant="block" />
                <Skeleton className="h-16" variant="block" />
                <Skeleton className="h-16" variant="block" />
            </View>
        );
    }

    // RLS : un non-membre (exclu, parti) ne voit ni la ligue ni son classement
    if (!league || leaderboard.isError || !leaderboard.data) {
        return (
            <View className="flex-1 items-center justify-center bg-bg p-6">
                <EmptyState title={t('leagues:detail.notFound')} />
            </View>
        );
    }

    const members = leaderboard.data;

    return (
        <ScrollView
            className="flex-1 bg-bg"
            contentContainerClassName="w-full max-w-[800px] gap-4 self-center p-5">
            <Stack.Screen options={{ title: league.name }} />

            {/* Identité */}
            <View className="flex-row items-center gap-3.5">
                <LeagueIcon color={league.color} name={league.name} />
                <View className="min-w-0 flex-1 gap-1.5">
                    <Text
                        className="font-display text-[28px] leading-[29px] text-text"
                        numberOfLines={1}>
                        {league.name}
                    </Text>
                    <View className="flex-row flex-wrap items-center gap-2">
                        <MembersLine count={members.length} />
                        <Badge tone={isOwner ? 'brand' : 'neutral'} variant="soft">
                            {isOwner
                                ? t('leagues:detail.badges.admin')
                                : t('leagues:detail.badges.member')}
                        </Badge>
                    </View>
                </View>
            </View>

            <SegmentedControl
                onChange={setTab}
                options={[
                    { value: 'standings', label: t('leagues:detail.tabs.standings') },
                    { value: 'results', label: t('leagues:detail.tabs.results') },
                    { value: 'settings', label: t('leagues:detail.tabs.settings') },
                ]}
                size="sm"
                value={tab}
            />

            {tab === 'standings' ? (
                <StandingsTab
                    inviteCode={league.invite_code}
                    members={members}
                    onInvite={() => setTab('settings')}
                    userId={userId}
                />
            ) : null}
            {tab === 'results' ? (
                <ResultsTab
                    competitionId={league.competition_id}
                    leagueId={league.id}
                    userId={userId}
                />
            ) : null}
            {tab === 'settings' ? (
                <SettingsTab
                    isOwner={isOwner}
                    league={league}
                    members={members}
                    // Ouvert par deep link, l'écran n'a pas de pile derrière lui :
                    // repli sur l'onglet Classement plutôt qu'un GO_BACK dans le vide
                    onLeft={() =>
                        router.canGoBack() ? router.back() : router.replace('/leaderboard')
                    }
                    userId={userId}
                />
            ) : null}
        </ScrollView>
    );
}

function MembersLine({ count }: { count: number }) {
    const { t } = useTranslation(['leagues']);
    const mutedColor = useThemeColor('text-muted');
    return (
        <View className="flex-row items-center gap-1">
            <Users color={mutedColor} size={13} strokeWidth={2} />
            <Text className="font-body-semibold text-[12.5px] text-text-muted">
                {t('leagues:detail.members', { count })}
            </Text>
        </View>
    );
}

function SectionOverline({
    label,
    tone = 'default',
}: {
    label: string;
    tone?: 'default' | 'danger';
}) {
    return (
        <Text
            className={cn(
                'font-body-bold text-[11px] uppercase tracking-[0.99px]',
                tone === 'danger' ? 'text-danger' : 'text-text-faint',
            )}>
            {label}
        </Text>
    );
}

/* ===================== Onglet Classement ===================== */

function StandingsTab({
    members,
    userId,
    inviteCode,
    onInvite,
}: {
    members: LeaderboardEntry[];
    userId: string | undefined;
    inviteCode: string;
    onInvite: () => void;
}) {
    const { t } = useTranslation(['leagues']);
    const accentColor = useThemeColor('accent');
    const entries = markTies(members);

    if (members.length === 1) {
        const me = members[0];
        return (
            <View className="gap-4 pt-1">
                <LeaderboardRow entry={me} isMe={me.user_id === userId} />
                <View className="items-center gap-3.5 rounded-md border border-dashed border-border-strong bg-surface px-4 pb-4 pt-5">
                    <View className="h-[60px] w-[60px] items-center justify-center rounded-pill bg-accent/12">
                        <UserPlus color={accentColor} size={28} strokeWidth={1.8} />
                    </View>
                    <View className="items-center gap-1.5">
                        <Text className="text-center font-display text-[22px] leading-[24px] text-text">
                            {t('leagues:detail.solo.title')}
                        </Text>
                        <Text className="max-w-[260px] text-center font-body text-[13.5px] leading-[20px] text-text-muted">
                            {t('leagues:detail.solo.message')}
                        </Text>
                    </View>
                    <View className="flex-row items-center gap-3 rounded-md bg-surface-sunken px-4 py-3">
                        <Text className="font-body-bold text-[10px] uppercase tracking-[0.8px] text-text-faint">
                            {t('leagues:detail.solo.codeOverline')}
                        </Text>
                        <Text className="font-display text-[24px] leading-[26px] tracking-[3px] text-text">
                            {inviteCode}
                        </Text>
                    </View>
                    <View className="w-full max-w-[260px]">
                        <Button
                            fullWidth
                            onPress={onInvite}
                            title={t('leagues:detail.invite')}
                            variant="brand"
                        />
                    </View>
                </View>
            </View>
        );
    }

    return (
        <View className="gap-5 pt-1">
            <Podium entries={members} meUserId={userId} />
            <View className="gap-2">
                <View className="flex-row items-baseline justify-between gap-2 px-0.5">
                    <Text className="font-body-bold text-[13px] uppercase tracking-[1.17px] text-text">
                        {t('leagues:leaderboard.full')}
                    </Text>
                    <Text className="font-body-semibold text-[11px] uppercase tracking-[0.44px] text-text-faint">
                        {t('leagues:detail.members', { count: members.length })}
                    </Text>
                </View>
                <View className="gap-1.5">
                    {entries.map((entry) => (
                        <LeaderboardRow
                            entry={entry}
                            isMe={entry.user_id === userId}
                            key={entry.user_id}
                            tie={entry.tie}
                        />
                    ))}
                </View>
            </View>
        </View>
    );
}

/* ===================== Onglet Résultats ===================== */

function ResultsTab({
    leagueId,
    competitionId,
    userId,
}: {
    leagueId: string;
    competitionId: string;
    userId: string | undefined;
}) {
    const { t } = useTranslation(['leagues']);
    const matches = useMatches(competitionId);
    const roundPoints = useLeagueRoundPoints(leagueId);
    const faintColor = useThemeColor('text-faint');
    const mutedColor = useThemeColor('text-muted');
    const [selectedKey, setSelectedKey] = useState<string | null>(null);

    const { stripItems, lastPlayed } = useMemo(
        () => buildStrip(matches.data ?? []),
        [matches.data],
    );
    const rounds = useMemo(() => groupRoundPoints(roundPoints.data ?? []), [roundPoints.data]);

    if (matches.isPending || roundPoints.isPending) {
        return (
            <View className="gap-2.5 pt-1">
                <Skeleton className="h-[66px]" variant="block" />
                <Skeleton className="h-16" variant="block" />
                <Skeleton className="h-16" variant="block" />
                <Skeleton className="h-16" variant="block" />
            </View>
        );
    }

    if (stripItems.length === 0 || !lastPlayed) {
        return (
            <View className="items-center pt-6">
                <EmptyState title={t('leagues:detail.results.empty')} />
            </View>
        );
    }

    const selected = selectedKey ?? lastPlayed.key;
    const selectedItem = stripItems.find((item) => item.key === selected) ?? lastPlayed;
    const selectedRound = rounds.find((round) => roundKeyOf(round.round) === selected);
    const meta = selectedRound
        ? new Intl.DateTimeFormat(i18n.language, {
              weekday: 'short',
              day: 'numeric',
              month: 'short',
          }).format(new Date(selectedRound.firstKickoff))
        : '';

    return (
        <View className="gap-4 pt-1">
            <View className="gap-2">
                <SectionOverline label={t('leagues:detail.results.roundOverline')} />
                <RoundStrip items={stripItems} onSelect={setSelectedKey} selected={selected} />
            </View>

            {selectedRound ? (
                <View className="gap-2.5">
                    <View className="flex-row items-baseline justify-between gap-2 px-0.5">
                        <Text className="font-body-bold text-[13px] uppercase tracking-[1.17px] text-text">
                            {t('leagues:detail.results.roundTitle', { round: selectedItem.label })}
                        </Text>
                        <Text className="font-body-semibold text-[11px] text-text-faint">
                            {meta}
                        </Text>
                    </View>
                    <View className="gap-1.5">
                        {selectedRound.entries.map((entry) => (
                            <RoundStandingRow
                                entry={entry}
                                isMe={entry.userId === userId}
                                key={entry.userId}
                            />
                        ))}
                    </View>
                    <View className="flex-row items-start gap-2 px-1 pt-1">
                        <Info color={mutedColor} size={14} strokeWidth={1.8} />
                        <Text className="flex-1 font-body text-[12px] leading-[17px] text-text-muted">
                            {t('leagues:detail.results.dayNote')}
                        </Text>
                    </View>
                </View>
            ) : (
                <View className="items-center gap-3 px-4 pb-2 pt-6">
                    <View className="h-[62px] w-[62px] items-center justify-center rounded-pill bg-surface-sunken">
                        <Clock color={faintColor} size={30} strokeWidth={1.6} />
                    </View>
                    <Text className="text-center font-display text-[22px] leading-[24px] text-text">
                        {t('leagues:detail.results.notPlayedTitle')}
                    </Text>
                    <Text className="max-w-[260px] text-center font-body text-[13.5px] leading-[20px] text-text-muted">
                        {t('leagues:detail.results.notPlayedMessage', {
                            round: selectedItem.label,
                        })}
                    </Text>
                    <Button
                        onPress={() => setSelectedKey(lastPlayed.key)}
                        size="sm"
                        title={t('leagues:detail.results.backToPlayed', {
                            round: lastPlayed.label,
                        })}
                        variant="secondary"
                    />
                </View>
            )}
        </View>
    );
}

/** Journées de la compétition, ordre chronologique (premier kickoff). */
function buildStrip(matches: readonly MatchWithTeams[]): {
    stripItems: RoundStripItem[];
    lastPlayed: RoundStripItem | null;
} {
    type Bucket = { round: string | null; firstKickoff: string; played: boolean };
    const buckets = new Map<string | null, Bucket>();
    for (const match of matches) {
        let bucket = buckets.get(match.round);
        if (!bucket) {
            bucket = { round: match.round, firstKickoff: match.kickoff_at, played: false };
            buckets.set(match.round, bucket);
        }
        if (match.kickoff_at < bucket.firstKickoff) bucket.firstKickoff = match.kickoff_at;
        if (match.status === 'finished') bucket.played = true;
    }
    const ordered = [...buckets.values()].sort((a, b) =>
        a.firstKickoff.localeCompare(b.firstKickoff),
    );
    const played = ordered.filter((bucket) => bucket.played);
    const lastPlayedBucket = played[played.length - 1] ?? null;
    const stripItems = ordered.map((bucket) => ({
        key: roundKeyOf(bucket.round),
        label: bucket.round ?? '—',
        played: bucket.played,
        emphasized: bucket === lastPlayedBucket,
    }));
    return {
        stripItems,
        lastPlayed: lastPlayedBucket
            ? (stripItems.find((item) => item.key === roundKeyOf(lastPlayedBucket.round)) ?? null)
            : null,
    };
}

/* ===================== Onglet Réglages ===================== */

function SettingsTab({
    league,
    members,
    isOwner,
    userId,
    onLeft,
}: {
    league: { id: string; name: string; invite_code: string; owner_id: string };
    members: LeaderboardEntry[];
    isOwner: boolean;
    userId: string | undefined;
    onLeft: () => void;
}) {
    const { t } = useTranslation(['leagues', 'common']);
    const leaveLeague = useLeaveLeague(userId ?? '');
    const deleteLeague = useDeleteLeague();
    const kickMember = useKickMember(league.id);
    const transferOwnership = useTransferOwnership(league.id);

    const [copied, setCopied] = useState(false);
    const [leaveOpen, setLeaveOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [transferOpen, setTransferOpen] = useState(false);
    const [removeTarget, setRemoveTarget] = useState<LeaderboardEntry | null>(null);

    const onBrandColor = useThemeColor('on-brand');
    const textColor = useThemeColor('text');
    const faintColor = useThemeColor('text-faint');
    const brandColor = useThemeColor('brand');
    const warningColor = useThemeColor('warning');

    const copyCode = async () => {
        await Clipboard.setStringAsync(league.invite_code);
        setCopied(true);
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
        <View className="gap-6 pt-1">
            {/* Invitation (tous) */}
            <View className="gap-2">
                <SectionOverline label={t('leagues:detail.settings.inviteOverline')} />
                <Card className="items-center gap-3.5 px-4 py-5">
                    <Text className="font-body-bold text-[11px] uppercase tracking-[0.88px] text-text-faint">
                        {t('leagues:detail.settings.codeOverline')}
                    </Text>
                    <Text className="pl-[6px] font-display text-[40px] leading-[42px] tracking-[6px] text-text">
                        {league.invite_code}
                    </Text>
                    <Text className="text-center font-body text-[12px] leading-[17px] text-text-muted">
                        {t('leagues:detail.settings.codeHint')}
                    </Text>
                    <View className="w-full flex-row gap-2.5">
                        <View className="flex-1">
                            <Button
                                fullWidth
                                leadingIcon={
                                    <Copy color={onBrandColor} size={16} strokeWidth={2} />
                                }
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
                </Card>
                {copied ? (
                    <Toast
                        message={t('leagues:detail.codeCopied', { code: league.invite_code })}
                        tone="success"
                    />
                ) : null}
            </View>

            {/* Gestion des membres (admin) */}
            {isOwner ? (
                <View className="gap-2">
                    <View className="flex-row items-baseline justify-between gap-2 px-0.5">
                        <SectionOverline label={t('leagues:detail.settings.membersOverline')} />
                        <Text className="font-body-semibold text-[11px] text-text-faint">
                            {t('leagues:detail.members', { count: members.length })}
                        </Text>
                    </View>
                    <Card className="overflow-hidden p-0">
                        {members.map((member, index) => {
                            const isCreator = member.user_id === league.owner_id;
                            const isMe = member.user_id === userId;
                            return (
                                <View className={cnMemberRow(index)} key={member.user_id}>
                                    <Avatar
                                        name={member.username}
                                        ring={isMe}
                                        size="sm"
                                        uri={member.avatar_url}
                                    />
                                    <View className="min-w-0 flex-1 gap-px">
                                        <Text
                                            className={
                                                isMe
                                                    ? 'font-body-bold text-[14.5px] text-text'
                                                    : 'font-body-semibold text-[14.5px] text-text'
                                            }
                                            numberOfLines={1}>
                                            {isMe
                                                ? t('leagues:detail.settings.memberYou', {
                                                      username: member.username,
                                                  })
                                                : member.username}
                                        </Text>
                                        <Text className="font-body-semibold text-[11px] text-text-faint">
                                            {isCreator
                                                ? t('leagues:detail.settings.creatorSub')
                                                : t('leagues:detail.settings.memberSub')}
                                        </Text>
                                    </View>
                                    {isCreator ? (
                                        <Badge tone="brand" variant="soft">
                                            {t('leagues:detail.settings.creatorTag')}
                                        </Badge>
                                    ) : null}
                                    {!isCreator && !isMe ? (
                                        <Pressable
                                            accessibilityLabel={t(
                                                'leagues:detail.settings.removeLabel',
                                            )}
                                            accessibilityRole="button"
                                            className="h-[34px] w-[34px] items-center justify-center rounded-pill"
                                            onPress={() => setRemoveTarget(member)}>
                                            <UserX color={faintColor} size={18} strokeWidth={2} />
                                        </Pressable>
                                    ) : null}
                                </View>
                            );
                        })}
                    </Card>
                    <Text className="px-0.5 font-body text-[11.5px] leading-[16px] text-text-faint">
                        {t('leagues:detail.settings.removeHint')}
                    </Text>
                </View>
            ) : null}

            {/* Zone de danger — le séparateur pointillé vit dans sa propre View :
                posé sur le conteneur, react-native-css propage le borderStyle
                aux bordures des descendants (cartes/boutons rendus dashed) */}
            {/* h-0 + bordure uniforme : iOS ne rend le dashed que si la largeur
                de bordure est identique sur les 4 côtés */}
            <View className="h-0 overflow-hidden border border-dashed border-border-strong" />
            <View className="gap-2">
                <SectionOverline
                    label={t('leagues:detail.settings.dangerOverline')}
                    tone="danger"
                />
                <View className="gap-3 rounded-md border border-danger/30 bg-danger/5 p-4">
                    {isOwner ? (
                        <>
                            <View className="flex-row items-start gap-2.5 rounded-sm border border-warning/30 bg-warning/12 px-3 py-2.5">
                                <TriangleAlert color={warningColor} size={16} strokeWidth={2} />
                                <Text className="flex-1 font-body text-[12.5px] leading-[18px] text-text">
                                    {t('leagues:detail.settings.ownerWarning')}
                                </Text>
                            </View>
                            <Pressable
                                accessibilityRole="button"
                                className="flex-row items-center gap-3 rounded-md border border-border-strong bg-surface px-3.5 py-3"
                                onPress={() => setTransferOpen(true)}>
                                <View className="h-8 w-8 items-center justify-center rounded-sm bg-brand/12">
                                    <ArrowLeftRight color={brandColor} size={17} strokeWidth={2} />
                                </View>
                                <View className="min-w-0 flex-1 gap-px">
                                    <Text className="font-body-bold text-[14.5px] text-text">
                                        {t('leagues:detail.settings.transferTitle')}
                                    </Text>
                                    <Text className="font-body text-[11.5px] text-text-muted">
                                        {t('leagues:detail.settings.transferSub')}
                                    </Text>
                                </View>
                                <ChevronRight color={faintColor} size={17} strokeWidth={2.2} />
                            </Pressable>
                            <Button
                                fullWidth
                                onPress={() => setDeleteOpen(true)}
                                title={t('leagues:detail.settings.deleteAction')}
                                variant="danger-outline"
                            />
                        </>
                    ) : (
                        <>
                            <View className="gap-1">
                                <Text className="font-body-bold text-[15px] text-text">
                                    {t('leagues:detail.settings.leaveTitle')}
                                </Text>
                                <Text className="font-body text-[12.5px] leading-[18px] text-text-muted">
                                    {t('leagues:detail.settings.leaveText')}
                                </Text>
                            </View>
                            <Button
                                fullWidth
                                onPress={() => setLeaveOpen(true)}
                                title={t('leagues:detail.settings.leaveTitle')}
                                variant="danger-outline"
                            />
                        </>
                    )}
                </View>
            </View>

            <LeaveLeagueModal
                leagueName={league.name}
                leaving={leaveLeague.isPending}
                onCancel={() => setLeaveOpen(false)}
                onConfirm={() =>
                    leaveLeague.mutate(league.id, {
                        onSuccess: () => {
                            setLeaveOpen(false);
                            onLeft();
                        },
                    })
                }
                visible={leaveOpen}
            />
            <DeleteLeagueModal
                deleting={deleteLeague.isPending}
                leagueName={league.name}
                onCancel={() => setDeleteOpen(false)}
                onConfirm={() =>
                    deleteLeague.mutate(league.id, {
                        onSuccess: () => {
                            setDeleteOpen(false);
                            onLeft();
                        },
                    })
                }
                visible={deleteOpen}
            />
            <RemoveMemberModal
                leagueName={league.name}
                member={
                    removeTarget
                        ? { username: removeTarget.username, avatarUrl: removeTarget.avatar_url }
                        : null
                }
                onCancel={() => setRemoveTarget(null)}
                onConfirm={() => {
                    if (!removeTarget) return;
                    kickMember.mutate(removeTarget.user_id, {
                        onSuccess: () => setRemoveTarget(null),
                    });
                }}
                removing={kickMember.isPending}
                visible={!!removeTarget}
            />
            <TransferOwnershipModal
                candidates={members
                    .filter((member) => member.user_id !== userId)
                    .map((member) => ({
                        userId: member.user_id,
                        username: member.username,
                        avatarUrl: member.avatar_url,
                    }))}
                onCancel={() => setTransferOpen(false)}
                onConfirm={(newOwnerId) =>
                    transferOwnership.mutate(newOwnerId, {
                        onSuccess: () => setTransferOpen(false),
                    })
                }
                transferring={transferOwnership.isPending}
                visible={transferOpen}
            />
        </View>
    );
}

function cnMemberRow(index: number) {
    return cn('flex-row items-center gap-3 px-3.5 py-3', index > 0 && 'border-t border-border');
}
