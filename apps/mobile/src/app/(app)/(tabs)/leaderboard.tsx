import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronRight, Globe } from 'lucide-react-native';
import { useDeferredValue, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList } from 'react-native';

import { HeaderActions } from '@/components/header-actions';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useSession } from '@/features/auth/session-context';
import { LeaderboardRow } from '@/features/leagues/components/leaderboard-row';
import { LeagueIcon } from '@/features/leagues/components/league-icon';
import { PinnedMeRow } from '@/features/leagues/components/pinned-me-row';
import { Podium } from '@/features/leagues/components/podium';
import { markTies } from '@/features/leagues/ranking';
import { useGlobalLeaderboard } from '@/features/leagues/use-global-leaderboard';
import { useLeagueLeaderboard } from '@/features/leagues/use-league-leaderboard';
import { useMyLeagues } from '@/features/leagues/use-my-leagues';
import { useMyRank } from '@/features/leagues/use-my-rank';
import { useMyStanding } from '@/features/leagues/use-my-standing';
import { useActiveCompetition } from '@/features/matches/use-active-competition';
import { useOpenPlayerProfile } from '@/features/profile/use-open-player-profile';
import { useProfile } from '@/features/profile/use-profile';
import { trackEvent } from '@/lib/analytics';
import { ActivityIndicator, Pressable, Text, useThemeColor, View } from '@/tw';
import { useScreenInsets } from '@/tw/use-screen-insets';

type Scope = 'leagues' | 'global';

/**
 * Classement (maquette) : bascule Ligues/Général, sélecteur de ligue en
 * dropdown, podium, ex æquo et ma position épinglée quand je suis hors du
 * top affiché du général.
 */
export default function LeaderboardScreen() {
    const { t } = useTranslation(['leagues', 'common']);
    const router = useRouter();
    const { session } = useSession();
    const userId = session?.user.id;
    const competition = useActiveCompetition();
    const myLeagues = useMyLeagues();
    const { data: profile } = useProfile(userId ?? '');
    const openPlayerProfile = useOpenPlayerProfile(userId);

    const [scope, setScope] = useState<Scope>('leagues');
    // `scope` en paramètre (carte « Tes points » → Général). L'onglet reste
    // monté : la demande s'applique au rendu (une fois par arrivée du
    // paramètre), puis l'effet l'efface pour qu'un nouveau passage par le
    // même lien rebascule même après un retour sur Ligues.
    const { scope: requestedScope } = useLocalSearchParams<{ scope?: Scope }>();
    const [appliedScope, setAppliedScope] = useState<Scope | undefined>(undefined);
    if (requestedScope !== appliedScope) {
        setAppliedScope(requestedScope);
        if (requestedScope === 'global' || requestedScope === 'leagues') setScope(requestedScope);
    }
    useEffect(() => {
        if (requestedScope) router.setParams({ scope: undefined });
    }, [requestedScope, router]);
    const [selectedLeagueId, setSelectedLeagueId] = useState<string | null>(null);
    const textMuted = useThemeColor('text-muted');
    const brandColor = useThemeColor('brand');
    const screenInsets = useScreenInsets();

    const leagues = myLeagues.data ?? [];
    const currentLeagueId = selectedLeagueId ?? leagues[0]?.id;
    const currentLeague = leagues.find((league) => league.id === currentLeagueId);
    const effectiveScope: Scope = leagues.length === 0 ? 'global' : scope;
    // La pastille suit `effectiveScope` (bascule immédiate au tap) ; tout le
    // contenu (board affiché, chrome de portée, liste des lignes) est piloté
    // par la valeur différée pour que le tap ne soit pas bloqué par le montage
    // synchrone des LeaderboardRow. Les requêtes, elles, se lancent tout de
    // suite sur `effectiveScope`.
    const deferredScope = useDeferredValue(effectiveScope);

    // Un événement par portée consultée : au montage, puis à chaque bascule
    // Ligues/Général.
    useEffect(() => {
        trackEvent({ name: 'leaderboard_viewed', props: { scope: effectiveScope } });
    }, [effectiveScope]);

    const globalBoard = useGlobalLeaderboard(
        effectiveScope === 'global' ? competition.data?.id : undefined,
    );
    const leagueBoard = useLeagueLeaderboard(
        effectiveScope === 'leagues' ? currentLeagueId : undefined,
    );
    const board = deferredScope === 'global' ? globalBoard : leagueBoard;

    const standing = useMyStanding(competition.data?.id, userId);
    const myRank = useMyRank(competition.data?.id, standing.isPending ? undefined : standing.data);

    // Chargement : `board` n'a rien à montrer, qu'il soit en première requête
    // ou en train de rejouer après un échec (une query en erreur garde
    // `status: 'error'` pendant tout son refetch, donc `isPending` reste faux).
    const loading =
        competition.isPending ||
        myLeagues.isPending ||
        (board.isFetching && board.data === undefined) ||
        (deferredScope === 'global'
            ? globalBoard.isPending
            : !!currentLeagueId && leagueBoard.isPending);
    // `board` suit la portée différée : pendant la bascule, il pointe encore sur
    // la query de l'autre onglet. Afficher son erreur ferait clignoter
    // « Impossible de charger le classement » au moment du tap.
    const settling = deferredScope !== effectiveScope;
    const failed =
        !loading &&
        !settling &&
        board.data === undefined &&
        (competition.isError || myLeagues.isError || board.isError);

    const entries = markTies(board.data ?? []);
    const hasTies = entries.some((entry) => entry.tie);
    const showPinnedMe =
        deferredScope === 'global' &&
        standing.data != null &&
        myRank.data?.rank != null &&
        profile != null &&
        entries.length > 0 &&
        !entries.some((entry) => entry.user_id === userId);

    // Pages suivantes du général au fil du défilement (le classement d'une
    // ligue arrive en une fois)
    const loadMore = () => {
        if (
            deferredScope === 'global' &&
            globalBoard.hasNextPage &&
            !globalBoard.isFetchingNextPage
        ) {
            void globalBoard.fetchNextPage();
        }
    };
    const showRows = !loading && !failed && entries.length > 0;

    const header = (
        <View
            className="w-full max-w-[800px] gap-4 self-center px-5 pb-2"
            style={{ paddingTop: screenInsets.top }}>
            <View className="flex-row items-start gap-3">
                <View className="min-w-0 flex-1 gap-1">
                    <Text className="font-display text-3xl leading-7.5 tracking-[0.3px] text-text">
                        {t('leagues:leaderboard.title')}
                    </Text>
                    {competition.data ? (
                        <Text className="font-body text-[13px] text-text-muted">
                            {competition.data.name}
                        </Text>
                    ) : null}
                </View>
                <HeaderActions />
            </View>

            {leagues.length > 0 ? (
                <SegmentedControl
                    onChange={setScope}
                    options={[
                        { value: 'leagues', label: t('leagues:leaderboard.tabs.leagues') },
                        { value: 'global', label: t('leagues:leaderboard.tabs.global') },
                    ]}
                    value={effectiveScope}
                />
            ) : null}

            {deferredScope === 'leagues' && leagues.length > 0 && currentLeagueId ? (
                <View className="gap-2.5">
                    <Select
                        accessibilityLabel={t('leagues:leaderboard.select.overline')}
                        leading={(option, placement) => {
                            const league = leagues.find((row) => row.id === option.value);
                            return league ? (
                                <LeagueIcon
                                    color={league.color}
                                    name={league.name}
                                    size={placement}
                                />
                            ) : null;
                        }}
                        onChange={setSelectedLeagueId}
                        options={leagues.map((league) => ({
                            value: league.id,
                            label: league.name,
                            description: t('leagues:detail.members', {
                                count: league.member_count,
                            }),
                        }))}
                        overline={t('leagues:leaderboard.select.overline')}
                        trailing={
                            currentLeague
                                ? t('leagues:detail.members', {
                                      count: currentLeague.member_count,
                                  })
                                : undefined
                        }
                        value={currentLeagueId}
                    />
                    {/* Accès au détail : lien discret sous le sélecteur (DS du 2026-09-21) */}
                    <Pressable
                        accessibilityRole="link"
                        className="flex-row items-center gap-0.5 self-end px-0.5"
                        hitSlop={8}
                        onPress={() =>
                            router.push({
                                pathname: '/league/[id]',
                                params: { id: currentLeagueId },
                            })
                        }>
                        <Text className="font-body-semibold text-[12px] text-text-muted">
                            {t('leagues:leaderboard.viewDetail')}
                        </Text>
                        <ChevronRight color={textMuted} size={13} strokeWidth={2.4} />
                    </Pressable>
                </View>
            ) : null}

            {deferredScope === 'global' ? (
                <Card className="flex-row items-center gap-2.5 px-3.5 py-2.75">
                    <View className="h-[34px] w-[34px] items-center justify-center rounded-sm bg-brand/10">
                        <Globe color={brandColor} size={18} strokeWidth={1.9} />
                    </View>
                    <View className="min-w-0 flex-1 gap-px">
                        <Text className="font-body-bold text-[10px] uppercase tracking-[0.6px] text-text-faint">
                            {t('leagues:leaderboard.general.overline')}
                        </Text>
                        <Text className="font-body-bold text-[15px] text-text">
                            {t('leagues:leaderboard.general.title')}
                        </Text>
                    </View>
                    {myRank.data ? (
                        <Text className="font-body text-[12px] text-text-muted">
                            {t('leagues:leaderboard.players', { count: myRank.data.total })}
                        </Text>
                    ) : null}
                </Card>
            ) : null}

            {loading ? (
                <View className="gap-2.5">
                    <Skeleton className="h-16" variant="block" />
                    <Skeleton className="h-16" variant="block" />
                    <Skeleton className="h-16" variant="block" />
                </View>
            ) : failed ? (
                // Dans le flux, pas en plein écran : le sélecteur d'onglet
                // reste accessible, l'autre portée peut très bien répondre.
                <EmptyState
                    action={
                        <Button
                            onPress={() => {
                                void competition.refetch();
                                void myLeagues.refetch();
                                void board.refetch();
                            }}
                            title={t('common:actions.retry')}
                            variant="secondary"
                        />
                    }
                    title={t('leagues:errors.load')}
                />
            ) : entries.length === 0 ? (
                <EmptyState
                    action={
                        leagues.length === 0 ? (
                            <View className="w-full max-w-75 gap-2.5">
                                <Button
                                    fullWidth
                                    onPress={() => router.push('/league/new')}
                                    title={t('leagues:actions.create')}
                                />
                                <Button
                                    fullWidth
                                    onPress={() =>
                                        router.push({
                                            pathname: '/league/new',
                                            params: { tab: 'join' },
                                        })
                                    }
                                    title={t('leagues:actions.join')}
                                    variant="secondary"
                                />
                            </View>
                        ) : undefined
                    }
                    message={t('leagues:leaderboard.empty')}
                    title={t('leagues:leaderboard.title')}
                />
            ) : (
                <View className="gap-4">
                    {entries.length >= 3 ? (
                        <Podium
                            entries={entries}
                            meUserId={userId}
                            onSelect={(id) =>
                                router.push({ pathname: '/player/[id]', params: { id } })
                            }
                        />
                    ) : null}
                    <View className="flex-row items-baseline justify-between gap-2 px-0.5">
                        <Text className="font-body-bold text-[13px] uppercase tracking-[1.17px] text-text">
                            {t('leagues:leaderboard.full')}
                        </Text>
                        <Text className="font-body-bold text-[11px] uppercase tracking-[0.44px] text-text-faint">
                            {t('leagues:leaderboard.players', {
                                count:
                                    deferredScope === 'global'
                                        ? (myRank.data?.total ?? entries.length)
                                        : entries.length,
                            })}
                        </Text>
                    </View>
                </View>
            )}
        </View>
    );

    return (
        <View className="flex-1 bg-bg">
            {/* Virtualisée : le général peut compter des milliers de lignes */}
            <FlatList
                contentContainerStyle={{ paddingBottom: screenInsets.bottomTabBar }}
                data={showRows ? entries : []}
                keyExtractor={(entry) => entry.user_id}
                ListFooterComponent={
                    showRows ? (
                        <View className="w-full max-w-[800px] self-center px-5">
                            {globalBoard.isFetchingNextPage && deferredScope === 'global' ? (
                                <ActivityIndicator className="py-3" />
                            ) : null}
                            {hasTies ? (
                                <Text className="px-1 pt-1 font-body text-[12px] leading-[17px] text-text-muted">
                                    {t('leagues:leaderboard.tieNote')}
                                </Text>
                            ) : null}
                        </View>
                    ) : null
                }
                ListHeaderComponent={header}
                onEndReached={loadMore}
                onEndReachedThreshold={0.8}
                renderItem={({ item: entry }) => (
                    <View className="w-full max-w-[800px] self-center px-5 pb-2">
                        <LeaderboardRow
                            entry={entry}
                            isMe={entry.user_id === userId}
                            onPress={openPlayerProfile(entry.user_id)}
                            tie={entry.tie}
                        />
                    </View>
                )}
                style={{ flex: 1 }}
            />

            {showPinnedMe && standing.data && myRank.data?.rank != null && profile ? (
                <PinnedMeRow
                    avatarUrl={profile.avatar_url}
                    gapToAbove={myRank.data.gapToAbove}
                    points={standing.data.total_points}
                    rank={myRank.data.rank}
                    username={profile.username}
                />
            ) : null}
        </View>
    );
}
