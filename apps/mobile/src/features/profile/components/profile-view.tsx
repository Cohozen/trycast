import { BlurTargetView } from 'expo-blur';
import { Stack, useRouter } from 'expo-router';
import { useHeaderHeight } from 'expo-router/react-navigation';
import { ChevronRight, Settings } from 'lucide-react-native';
import { useDeferredValue, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ListRenderItemInfo, View as RNView } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

import { CollapsingHeaderTitle } from '@/components/collapsing-header-title';
import { GlassHeader } from '@/components/glass-header';
import { NotificationsBell } from '@/components/notifications-bell';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { IconButton } from '@/components/ui/icon-button';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Skeleton } from '@/components/ui/skeleton';
import { useCollapseProgress } from '@/components/use-collapse-progress';
import { LeagueIcon } from '@/features/leagues/components/league-icon';
import { useMyLeagueRanks } from '@/features/leagues/use-my-league-ranks';
import { useMyLeagues } from '@/features/leagues/use-my-leagues';
import { useMyRank } from '@/features/leagues/use-my-rank';
import { useMyStanding } from '@/features/leagues/use-my-standing';
import type { MatchWithTeams } from '@/features/matches/types';
import { useCompetitions } from '@/features/matches/use-competitions';
import { useMatches } from '@/features/matches/use-matches';
import { PointsDetailSheet } from '@/features/predictions/components/points-detail-sheet';
import type { PredictionRow } from '@/features/predictions/types';
import { useUserPredictions } from '@/features/predictions/use-user-predictions';
import { CompetitionChips } from '@/features/profile/components/competition-chips';
import { ProfilePredictionCard } from '@/features/profile/components/profile-prediction-card';
import { ProfileStatsPanel } from '@/features/profile/components/profile-stats';
import { computePointsByRound } from '@/features/profile/compute-points-by-round';
import { computeProfileStats } from '@/features/profile/compute-profile-stats';
import { useProfile } from '@/features/profile/use-profile';
import { i18n } from '@/lib/i18n';
import { Pressable, Text, useThemeColor, View } from '@/tw';
import { useScreenInsets } from '@/tw/use-screen-insets';
import { cn } from '@/tw/variants';

type ProfileTab = 'stats' | 'predictions' | 'leagues';

type ProfileViewProps = {
    /** Joueur affiché — pas forcément l'utilisateur connecté. */
    userId: string;
    /**
     * Mon propre profil (onglet Profil) : ajoute Réglages et l'onglet Ligues.
     * En public, l'écran est poussé avec la barre native (retour système) et
     * un header repliable en verre.
     */
    isSelf: boolean;
    /** Onglet ouvert d'emblée (profil public ouvert depuis un prono : Pronos). */
    initialTab?: ProfileTab;
};

/** Lignes de la liste : en-tête de jour et carte de l'onglet Pronos, ou le contenu d'un autre onglet. */
type ProfileItem =
    | { kind: 'day'; key: string; title: string }
    | { kind: 'match'; key: string; match: MatchWithTeams }
    | { kind: 'content'; key: string };

/**
 * Cartes montées par tranche : une compétition longue (Top 14, ~180 matchs)
 * ferait ramer le changement d'onglet si tout se montait d'un coup. La liste
 * est en plus virtualisée (FlatList) ; les données, légères, arrivent en une
 * fois (`get_user_predictions`).
 */
const PAGE_SIZE = 20;

/**
 * Corps du Profil, partagé entre mon profil (onglet) et le profil public d'un
 * autre joueur (écran poussé) : identité + chiffres clés, sélecteur de
 * compétition en puces (contexte de tout l'écran), onglets Stats / Pronos (+ Ligues
 * pour moi seul). Les pronos passent toujours par la RPC get_user_predictions,
 * qui ne rend que les matchs déjà commencés.
 */
export function ProfileView({ userId, isSelf, initialTab }: ProfileViewProps) {
    const { t } = useTranslation(['profile', 'leagues', 'common']);
    const router = useRouter();

    const { data: profile, isPending: profilePending } = useProfile(userId);
    const competitions = useCompetitions();
    const [selectedCompetitionId, setSelectedCompetitionId] = useState<string | null>(null);
    const [tab, setTab] = useState<ProfileTab>(initialTab ?? 'stats');
    // La pastille (SegmentedControl) suit `tab` et bouge au tap ; le contenu
    // lourd (liste des Pronos) est piloté par la valeur différée pour ne pas
    // bloquer le thread JS pendant le changement d'onglet.
    const deferredTab = useDeferredValue(tab);

    const competitionList = competitions.data ?? [];
    const competitionId =
        selectedCompetitionId ??
        competitionList.find((c) => c.is_active)?.id ??
        competitionList[0]?.id;

    const standing = useMyStanding(competitionId, userId);
    const myRank = useMyRank(competitionId, standing.isPending ? undefined : standing.data);
    const matches = useMatches(competitionId);
    const predictions = useUserPredictions(userId, competitionId);
    // Mes ligues n'ont de sens que sur mon profil : la requête est partagée
    // avec le reste de l'app (même clé), elle ne coûte rien de plus ici.
    const myLeagues = useMyLeagues();
    const leagues = myLeagues.data ?? [];
    const leagueRanks = useMyLeagueRanks(isSelf ? leagues.map((league) => league.id) : [], userId);

    const textColor = useThemeColor('text');
    const faintColor = useThemeColor('text-faint');
    const bgColor = useThemeColor('bg');
    const screenInsets = useScreenInsets();

    // Profil public : identité, compétitions, chiffres et onglets vivent sous
    // la barre native, dans le verre (DS 2026-09-24). Le bloc du haut se
    // replie au pixel près du défilement (la liste reste collée aux onglets),
    // l'identité passe en résumé (avatar + pseudo) dans la barre.
    const headerHeight = useHeaderHeight();
    const blurTarget = useRef<RNView>(null);
    // Hauteurs naturelles, mesurées : la liste les réserve en padding
    const [topHeight, setTopHeight] = useState(0);
    const [tabsHeight, setTabsHeight] = useState(0);
    // `reach` : de quoi replier tout le bloc même quand l'onglet affiché est court
    const collapse = useCollapseProgress<Animated.FlatList<ProfileItem>>({
        start: 12,
        distance: 56,
        reach: Math.max(260, topHeight),
    });
    const identityStyle = useAnimatedStyle(() => ({
        opacity: 1 - collapse.progress.value * 0.92,
        transform: [{ scale: 1 - collapse.progress.value * 0.05 }],
    }));
    const topClip = useAnimatedStyle(() => {
        if (topHeight === 0) return {};
        const hidden = Math.min(topHeight, Math.max(0, collapse.offset.value));
        return { height: topHeight - hidden };
    });
    const topSlide = useAnimatedStyle(() => ({
        transform: [{ translateY: -Math.min(topHeight, Math.max(0, collapse.offset.value)) }],
    }));

    // Pagination de l'onglet Pronos, remise à zéro à chaque onglet/compétition
    const pageKey = `${deferredTab}:${competitionId}`;
    const [page, setPage] = useState({ key: pageKey, count: PAGE_SIZE });
    const shownCount = page.key === pageKey ? page.count : PAGE_SIZE;

    // Une seule sheet pour toute la liste ; la cible reste posée pendant la
    // sortie animée
    const [pointsTarget, setPointsTarget] = useState<{
        match: MatchWithTeams;
        prediction: PredictionRow;
    } | null>(null);
    const [pointsOpen, setPointsOpen] = useState(false);

    const stats = computeProfileStats(predictions.data ?? new Map(), matches.data ?? []);
    const trend = computePointsByRound(predictions.data ?? new Map(), matches.data ?? []);
    const memberSince = profile
        ? new Intl.DateTimeFormat(i18n.language, { month: 'long', year: 'numeric' }).format(
              new Date(profile.created_at),
          )
        : null;

    const figures: { key: string; label: string; value: string }[] = [
        {
            key: 'points',
            label: t('profile:figures.points'),
            value: standing.data ? String(standing.data.total_points) : '—',
        },
        {
            key: 'rank',
            label: t('profile:figures.rank'),
            value: myRank.data?.rank != null ? `#${myRank.data.rank}` : '—',
        },
        {
            key: 'precision',
            label: t('profile:figures.precision'),
            value: stats.precisionPct !== null ? `${stats.precisionPct}%` : '—',
        },
    ];

    // Tous les matchs terminés, pronostiqués ou non (la carte gère le cas
    // sans prono), du plus récent au plus ancien.
    const finishedMatches = (matches.data ?? [])
        .filter((match) => match.status === 'finished')
        .sort((a, b) => b.kickoff_at.localeCompare(a.kickoff_at));

    const dayFormat = new Intl.DateTimeFormat(i18n.language, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
    });

    const tabsLoading =
        matches.isPending ||
        predictions.isPending ||
        standing.isPending ||
        (isSelf && myLeagues.isPending);

    // Onglet Pronos : en-têtes de jour et cartes à plat dans la liste. Mon
    // profil colle ses en-têtes de jour ; le profil public les laisse filer
    // (ses onglets sont dans le verre, un en-tête collé passerait dessous).
    const items: ProfileItem[] = [];
    const stickyIndices: number[] = [];
    const showPredictionList =
        !tabsLoading && deferredTab === 'predictions' && finishedMatches.length > 0;
    if (showPredictionList) {
        let lastTitle: string | null = null;
        for (const match of finishedMatches.slice(0, shownCount)) {
            const title = dayFormat.format(new Date(match.kickoff_at));
            if (title !== lastTitle) {
                if (isSelf) stickyIndices.push(items.length);
                items.push({ kind: 'day', key: `day-${match.id}`, title });
                lastTitle = title;
            }
            items.push({ kind: 'match', key: match.id, match });
        }
    } else {
        items.push({ kind: 'content', key: `content-${deferredTab}` });
    }
    const showMore = () => {
        if (showPredictionList && shownCount < finishedMatches.length) {
            setPage({ key: pageKey, count: shownCount + PAGE_SIZE });
        }
    };

    const identity = (
        <View className="flex-row gap-3.5">
            {profilePending ? (
                <Skeleton className="h-16 flex-1" variant="block" />
            ) : (
                <>
                    <Avatar
                        name={profile?.username ?? '?'}
                        ring
                        size="lg"
                        uri={profile?.avatar_url}
                    />
                    <View className="min-w-0 flex-1">
                        <Text className="font-display text-[27px] leading-6.75 text-text">
                            {profile?.username}
                        </Text>
                        {memberSince ? (
                            <Text className="font-body text-[12.5px] text-text-muted">
                                {t('profile:memberSince', { date: memberSince })}
                            </Text>
                        ) : null}
                    </View>
                </>
            )}
            {isSelf ? (
                <View className="flex-row gap-2">
                    <NotificationsBell />
                    <IconButton
                        accessibilityLabel={t('profile:settings.title')}
                        onPress={() => router.push('/settings')}
                        variant="soft">
                        <Settings color={textColor} size={20} strokeWidth={1.9} />
                    </IconButton>
                </View>
            ) : null}
        </View>
    );
    const competitionChips =
        competitionList.length > 0 && competitionId ? (
            <CompetitionChips
                competitions={competitionList}
                onChange={setSelectedCompetitionId}
                value={competitionId}
            />
        ) : null;
    const figuresCard = (
        <Card className="flex-row overflow-hidden p-0">
            {figures.map((figure, index) => (
                <View
                    className={`flex-1 items-center gap-1 px-1 py-3 ${index > 0 ? 'border-l border-border' : ''}`}
                    key={figure.key}>
                    <Text className="font-display text-[23px] leading-5.75 text-text">
                        {figure.value}
                    </Text>
                    <Text className="font-body-bold text-[9.5px] uppercase tracking-[0.57px] text-text-faint">
                        {figure.label}
                    </Text>
                </View>
            ))}
        </Card>
    );
    const tabsControl = (
        <SegmentedControl
            onChange={setTab}
            options={[
                { value: 'stats', label: t('profile:tabs.stats') },
                { value: 'predictions', label: t('profile:tabs.predictions') },
                // Ligues : mes ligues, donc mon profil seulement
                ...(isSelf
                    ? [{ value: 'leagues' as const, label: t('profile:tabs.leagues') }]
                    : []),
            ]}
            value={tab}
        />
    );
    const leagueActions = (
        <>
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
        </>
    );
    const tabContent = tabsLoading ? (
        <View className="gap-2.5">
            <Skeleton className="h-24" variant="block" />
            <Skeleton className="h-24" variant="block" />
        </View>
    ) : deferredTab === 'stats' ? (
        <ProfileStatsPanel
            owner={isSelf ? 'self' : 'other'}
            points={standing.data?.total_points ?? null}
            rank={myRank.data?.rank ?? null}
            stats={stats}
            totalPlayers={myRank.data?.total ?? null}
            trend={trend}
        />
    ) : deferredTab === 'predictions' ? (
        <EmptyState
            message={t(
                isSelf
                    ? 'profile:predictions.emptyMessage'
                    : 'profile:predictions.emptyMessageOther',
            )}
            title={t('profile:predictions.emptyTitle')}
        />
    ) : leagues.length === 0 ? (
        <EmptyState
            action={<View className="w-full max-w-75 gap-2.5">{leagueActions}</View>}
            message={t('leagues:hero.message')}
            title={t('leagues:hero.title')}
        />
    ) : (
        <View className="gap-2">
            {leagues.map((league) => {
                const rank = leagueRanks.get(league.id) ?? null;
                return (
                    <Pressable
                        accessibilityRole="button"
                        key={league.id}
                        onPress={() =>
                            router.push({
                                pathname: '/league/[id]',
                                params: { id: league.id },
                            })
                        }>
                        <Card className="flex-row items-center gap-3 px-3.5 py-3">
                            <LeagueIcon color={league.color} name={league.name} size="list" />
                            <View className="min-w-0 flex-1 gap-0.5">
                                <Text
                                    className="font-body-bold text-[15px] text-text"
                                    numberOfLines={1}>
                                    {league.name}
                                </Text>
                                <Text className="font-body text-[12px] text-text-muted">
                                    {t('leagues:detail.members', { count: league.member_count })}
                                </Text>
                            </View>
                            {rank !== null ? (
                                <View className="items-center gap-0.5">
                                    <View className="flex-row items-baseline gap-0.5">
                                        <Text className="font-display text-[21px] leading-[22px] text-accent">
                                            {rank}
                                        </Text>
                                        <Text className="font-body-bold text-[10px] text-accent">
                                            {t(
                                                rank === 1
                                                    ? 'profile:leaguesTab.rankSuffixFirst'
                                                    : 'profile:leaguesTab.rankSuffix',
                                            )}
                                        </Text>
                                    </View>
                                    <Text className="font-body-bold text-[9px] uppercase tracking-[0.45px] text-text-faint">
                                        {t('profile:leaguesTab.yourRank')}
                                    </Text>
                                </View>
                            ) : null}
                            <View className="-mr-1">
                                <ChevronRight color={faintColor} size={18} strokeWidth={2.2} />
                            </View>
                        </Card>
                    </Pressable>
                );
            })}
            {/* Mêmes boutons que l'état « aucune ligue » et que le
                Classement — seuls le titre et le message du héros
                sont réservés au cas sans ligue */}
            <View className="mt-1.5 gap-2.5">{leagueActions}</View>
        </View>
    );

    const renderItem = ({ item, index }: ListRenderItemInfo<ProfileItem>) => {
        if (item.kind === 'day') {
            // Fond opaque obligatoire : les cartes défilent sous l'en-tête collé
            return (
                <View
                    className={cn(
                        'w-full max-w-[800px] self-center bg-bg px-5 pb-2',
                        index > 0 && 'pt-3',
                    )}>
                    <Text className="px-0.5 font-body-bold text-[13px] uppercase tracking-[1.17px] text-text">
                        {item.title}
                    </Text>
                </View>
            );
        }
        if (item.kind === 'match') {
            return (
                <View className="w-full max-w-[800px] self-center px-5 pb-2">
                    <ProfilePredictionCard
                        match={item.match}
                        onOpenMatch={() =>
                            router.push({ pathname: '/match/[id]', params: { id: item.match.id } })
                        }
                        onOpenPoints={(prediction) => {
                            setPointsTarget({ match: item.match, prediction });
                            setPointsOpen(true);
                        }}
                        prediction={predictions.data?.get(item.match.id)}
                    />
                </View>
            );
        }
        return <View className="w-full max-w-[800px] self-center px-5">{tabContent}</View>;
    };

    const pointsSheet = pointsTarget ? (
        <PointsDetailSheet
            match={pointsTarget.match}
            onClose={() => setPointsOpen(false)}
            prediction={pointsTarget.prediction}
            visible={pointsOpen}
        />
    ) : null;

    const list = (contentContainerStyle: object) => (
        <Animated.FlatList
            contentContainerStyle={contentContainerStyle}
            data={items}
            initialNumToRender={12}
            keyExtractor={(item: ProfileItem) => item.key}
            onEndReached={showMore}
            onEndReachedThreshold={0.6}
            onLayout={collapse.onLayout}
            ref={collapse.scrollRef}
            // Android : le détachement des vues hors écran (actif par défaut sur
            // une FlatList) plante avec des en-têtes collants (« addViewAt:
            // failed to insert view »), vécu sur l'onglet Pronos de mon profil
            removeClippedSubviews={false}
            renderItem={renderItem}
            stickyHeaderIndices={stickyIndices}
            style={{ flex: 1 }}
            windowSize={9}
        />
    );

    if (!isSelf) {
        return (
            <>
                <Stack.Screen
                    options={{
                        headerTitleAlign: 'center',
                        headerTransparent: true,
                        headerStyle: { backgroundColor: 'transparent' },
                        headerTitle: () => (
                            <CollapsingHeaderTitle
                                compact={
                                    <>
                                        <Avatar
                                            name={profile?.username ?? '?'}
                                            size="sm"
                                            uri={profile?.avatar_url}
                                        />
                                        <Text
                                            className="shrink font-body-semibold text-[16px] text-text"
                                            numberOfLines={1}>
                                            {profile?.username}
                                        </Text>
                                    </>
                                }
                                progress={collapse.progress}
                                title={t('profile:title')}
                            />
                        ),
                    }}
                />
                <BlurTargetView ref={blurTarget} style={{ flex: 1, backgroundColor: bgColor }}>
                    {list({
                        minHeight: collapse.minContentHeight,
                        paddingTop: headerHeight + topHeight + tabsHeight + 8,
                        paddingBottom: 40,
                    })}
                </BlurTargetView>
                <GlassHeader blurTarget={blurTarget} progress={collapse.progress}>
                    <View className="w-full max-w-[800px] self-center px-5">
                        {/* Bloc du haut : glisse sous la barre au défilement */}
                        <Animated.View style={[{ overflow: 'hidden' }, topClip]}>
                            <Animated.View
                                onLayout={(event) => setTopHeight(event.nativeEvent.layout.height)}
                                style={topSlide}>
                                <View className="gap-3.5 pb-3.5">
                                    <Animated.View
                                        style={[{ transformOrigin: 'top' }, identityStyle]}>
                                        {identity}
                                    </Animated.View>
                                    {competitionChips}
                                    {figuresCard}
                                </View>
                            </Animated.View>
                        </Animated.View>
                        <View
                            className="pb-2"
                            onLayout={(event) => setTabsHeight(event.nativeEvent.layout.height)}>
                            {tabsControl}
                        </View>
                    </View>
                </GlassHeader>
                {pointsSheet}
            </>
        );
    }

    return (
        <View className="flex-1 bg-bg">
            {/* Bloc épinglé : identité, chiffres clés, compétition, onglets */}
            <View
                className="w-full max-w-[800px] flex-none gap-3.5 self-center px-5 pb-2"
                style={{ paddingTop: screenInsets.top }}>
                {identity}
                {competitionChips}
                {figuresCard}
                {tabsControl}
            </View>

            {/* Seul le contenu de l'onglet défile */}
            {list({ paddingTop: 14, paddingBottom: screenInsets.bottomTabBar })}
            {pointsSheet}
        </View>
    );
}
