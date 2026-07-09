import { useRouter } from 'expo-router';
import { ChevronRight, Settings, Trophy, Users } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { IconButton } from '@/components/ui/icon-button';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useSession } from '@/features/auth/session-context';
import { useMyLeagues } from '@/features/leagues/use-my-leagues';
import { useMyRank } from '@/features/leagues/use-my-rank';
import { useMyStanding } from '@/features/leagues/use-my-standing';
import { useCompetitions } from '@/features/matches/use-competitions';
import { useMatches } from '@/features/matches/use-matches';
import { ResultCard } from '@/features/predictions/components/result-card';
import { useMyPredictions } from '@/features/predictions/use-my-predictions';
import { computeProfileStats } from '@/features/profile/compute-profile-stats';
import { ProfileStatsPanel } from '@/features/profile/components/profile-stats';
import { useProfile } from '@/features/profile/use-profile';
import { i18n } from '@/lib/i18n';
import { Pressable, ScrollView, Text, useThemeColor, View } from '@/tw';

type ProfileTab = 'stats' | 'predictions' | 'leagues';

/**
 * Écran Profil (maquette Profil) : identité + chiffres clés, sélecteur de
 * compétition (contexte de tout l'écran), tabs Stats / Pronos / Ligues.
 * Structure iso maquette sur les données disponibles ; la courbe par journée
 * attend son backend (état vide assumé).
 */
export default function ProfileScreen() {
    const { t } = useTranslation(['profile', 'leagues', 'common']);
    const router = useRouter();
    const { session } = useSession();
    const userId = session?.user.id ?? '';

    const { data: profile, isPending: profilePending } = useProfile(userId);
    const competitions = useCompetitions();
    const [selectedCompetitionId, setSelectedCompetitionId] = useState<string | null>(null);
    const [tab, setTab] = useState<ProfileTab>('stats');

    const competitionList = competitions.data ?? [];
    const competitionId =
        selectedCompetitionId ??
        competitionList.find((c) => c.is_active)?.id ??
        competitionList[0]?.id;

    const standing = useMyStanding(competitionId, userId);
    const myRank = useMyRank(competitionId, standing.isPending ? undefined : standing.data);
    const matches = useMatches(competitionId);
    const predictions = useMyPredictions(competitionId);
    const myLeagues = useMyLeagues();

    const textColor = useThemeColor('text');
    const brandColor = useThemeColor('brand');
    const accentColor = useThemeColor('accent');
    const faintColor = useThemeColor('text-faint');

    const stats = computeProfileStats([...(predictions.data?.values() ?? [])]);
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

    const scoredMatches = (matches.data ?? [])
        .filter((match) => {
            const prediction = predictions.data?.get(match.id);
            return prediction !== undefined && prediction.points_awarded !== null;
        })
        .sort((a, b) => b.kickoff_at.localeCompare(a.kickoff_at));

    const dayTitleOf = (iso: string) =>
        new Intl.DateTimeFormat(i18n.language, {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
        }).format(new Date(iso));

    const leagues = myLeagues.data ?? [];
    const tabsLoading =
        matches.isPending || predictions.isPending || standing.isPending || myLeagues.isPending;

    return (
        <ScrollView
            className="flex-1 bg-bg"
            contentContainerClassName="w-full max-w-[800px] gap-3.5 self-center px-5 pb-32 pt-14">
            {/* Action row + identité */}
            <View className="flex-row items-center justify-end">
                <IconButton
                    accessibilityLabel={t('profile:settings.title')}
                    onPress={() => router.push('/settings')}
                    variant="soft">
                    <Settings color={textColor} size={20} strokeWidth={1.9} />
                </IconButton>
            </View>

            {profilePending ? (
                <Skeleton className="h-[56px]" variant="block" />
            ) : (
                <View className="flex-row items-center gap-3.5">
                    <Avatar name={profile?.username ?? '?'} ring size="lg" />
                    <View className="min-w-0 flex-1 gap-1">
                        <Text className="font-display text-[27px] leading-[27px] text-text">
                            {profile?.username}
                        </Text>
                        {memberSince ? (
                            <Text className="font-body text-[12.5px] text-text-muted">
                                {t('profile:memberSince', { date: memberSince })}
                            </Text>
                        ) : null}
                    </View>
                </View>
            )}

            {/* Chiffres clés */}
            <Card className="flex-row overflow-hidden p-0">
                {figures.map((figure, index) => (
                    <View
                        className={`flex-1 items-center gap-1 px-1 py-3 ${index > 0 ? 'border-l border-border' : ''}`}
                        key={figure.key}>
                        <Text className="font-display text-[23px] leading-[23px] text-text">
                            {figure.value}
                        </Text>
                        <Text className="font-body-bold text-[9.5px] uppercase tracking-[0.57px] text-text-faint">
                            {figure.label}
                        </Text>
                    </View>
                ))}
            </Card>

            {/* Sélecteur de compétition */}
            {competitionList.length > 0 && competitionId ? (
                <Select
                    icon={<Trophy color={brandColor} size={18} strokeWidth={1.9} />}
                    onChange={setSelectedCompetitionId}
                    options={competitionList.map((competition) => ({
                        value: competition.id,
                        label: competition.name,
                        badge: competition.is_active ? t('profile:competition.current') : undefined,
                    }))}
                    overline={t('profile:competition.overline')}
                    value={competitionId}
                />
            ) : null}

            <SegmentedControl
                onChange={setTab}
                options={[
                    { value: 'stats', label: t('profile:tabs.stats') },
                    { value: 'predictions', label: t('profile:tabs.predictions') },
                    { value: 'leagues', label: t('profile:tabs.leagues') },
                ]}
                value={tab}
            />

            {tabsLoading ? (
                <View className="gap-2.5">
                    <Skeleton className="h-24" variant="block" />
                    <Skeleton className="h-24" variant="block" />
                </View>
            ) : tab === 'stats' ? (
                <ProfileStatsPanel
                    points={standing.data?.total_points ?? null}
                    rank={myRank.data?.rank ?? null}
                    stats={stats}
                    totalPlayers={myRank.data?.total ?? null}
                />
            ) : tab === 'predictions' ? (
                scoredMatches.length === 0 ? (
                    <EmptyState
                        message={t('profile:predictions.emptyMessage')}
                        title={t('profile:predictions.emptyTitle')}
                    />
                ) : (
                    <View className="gap-3">
                        {scoredMatches.map((match, index) => {
                            const dayTitle = dayTitleOf(match.kickoff_at);
                            const newDay =
                                index === 0 ||
                                dayTitle !== dayTitleOf(scoredMatches[index - 1].kickoff_at);
                            return (
                                <View className="gap-3" key={match.id}>
                                    {newDay ? (
                                        <Text className="px-0.5 font-body-bold text-[13px] uppercase tracking-[1.17px] text-text">
                                            {dayTitle}
                                        </Text>
                                    ) : null}
                                    <ResultCard
                                        match={match}
                                        prediction={predictions.data?.get(match.id)}
                                    />
                                </View>
                            );
                        })}
                    </View>
                )
            ) : leagues.length === 0 ? (
                <EmptyState
                    action={
                        <View className="w-full min-w-[240px] gap-2.5">
                            <Button
                                fullWidth
                                onPress={() => router.push('/league/create')}
                                title={t('leagues:actions.create')}
                            />
                            <Button
                                fullWidth
                                onPress={() => router.push('/league/join')}
                                title={t('leagues:actions.join')}
                                variant="secondary"
                            />
                        </View>
                    }
                    message={t('leagues:hero.message')}
                    title={t('leagues:hero.title')}
                />
            ) : (
                <View className="gap-2.5">
                    {leagues.map((league) => (
                        <Pressable
                            accessibilityRole="button"
                            key={league.id}
                            onPress={() =>
                                router.push({
                                    pathname: '/league/[id]',
                                    params: { id: league.id },
                                })
                            }>
                            <Card className="flex-row items-center gap-3 px-4 py-3.5">
                                <View className="h-[34px] w-[34px] items-center justify-center rounded-sm bg-accent/10">
                                    <Users color={accentColor} size={17} strokeWidth={1.9} />
                                </View>
                                <Text className="min-w-0 flex-1 font-body-bold text-[15px] text-text">
                                    {league.name}
                                </Text>
                                <ChevronRight color={faintColor} size={18} strokeWidth={2} />
                            </Card>
                        </Pressable>
                    ))}
                    <View className="mt-1 flex-row gap-2.5">
                        <View className="flex-1">
                            <Button
                                fullWidth
                                onPress={() => router.push('/league/create')}
                                size="sm"
                                title={t('leagues:actions.create')}
                                variant="secondary"
                            />
                        </View>
                        <View className="flex-1">
                            <Button
                                fullWidth
                                onPress={() => router.push('/league/join')}
                                size="sm"
                                title={t('leagues:actions.join')}
                                variant="secondary"
                            />
                        </View>
                    </View>
                </View>
            )}
        </ScrollView>
    );
}
