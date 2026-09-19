import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useWindowDimensions } from 'react-native';

import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { ReactionFilter } from '@/features/reactions/components/reaction-filter';
import { ReactorRow } from '@/features/reactions/components/reactor-row';
import {
    isReactionKey,
    REACTIONS,
    type ReactionCounts,
    type ReactionKey,
    reactionEmoji,
    totalReactions,
} from '@/features/reactions/reactions';
import type { ReactionsTarget } from '@/features/reactions/types';
import { usePredictionReactors } from '@/features/reactions/use-prediction-reactors';
import { ScrollView, Text, View } from '@/tw';

type ReactionsSheetProps = {
    /** Prono dont on consulte les réactions ; null = sheet fermée. */
    target: ReactionsTarget | null;
    onClose: () => void;
    leagueId: string | undefined;
    matchId: string | undefined;
    /** Compteurs de la ligne (cache de la liste), en attendant la liste nominative. */
    counts: ReactionCounts;
    userId: string | undefined;
};

type Filter = 'all' | ReactionKey;

/**
 * Sheet « Réactions » : qui a réagi au prono d'un membre, filtrable par
 * réaction. La liste nominative n'est chargée qu'ici (RPC
 * get_prediction_reactors) ; un ancien membre y figure anonymisé.
 */
export function ReactionsSheet({
    target,
    onClose,
    leagueId,
    matchId,
    counts,
    userId,
}: ReactionsSheetProps) {
    const { t } = useTranslation('reactions');
    const window = useWindowDimensions();

    // Dernier prono affiché : le contenu reste en place pendant la sortie.
    const [shown, setShown] = useState<ReactionsTarget | null>(target);
    if (target && target !== shown) {
        setShown(target);
    }
    // Filtre rattaché au prono consulté : rouvrir la sheet sur un autre
    // membre repart de « Toutes », sans effet de réinitialisation.
    const [filterState, setFilterState] = useState<{ userId: string; key: Filter } | null>(null);
    const filter: Filter =
        filterState && filterState.userId === shown?.userId ? filterState.key : 'all';

    const reactors = usePredictionReactors(leagueId, matchId, shown?.userId);

    // Une fois la liste chargée, c'est elle qui fait foi (elle est plus fraîche
    // que les compteurs de la ligne si quelqu'un a réagi entre-temps).
    const liveCounts: ReactionCounts = reactors.data
        ? reactors.data.reduce<ReactionCounts>((acc, reactor) => {
              if (isReactionKey(reactor.reaction)) {
                  acc[reactor.reaction] = (acc[reactor.reaction] ?? 0) + 1;
              }
              return acc;
          }, {})
        : counts;
    const total = totalReactions(liveCounts);
    const present = REACTIONS.filter(({ key }) => (liveCounts[key] ?? 0) > 0);
    const rows = (reactors.data ?? []).flatMap(({ reaction, ...reactor }) =>
        isReactionKey(reaction) && (filter === 'all' || reaction === filter)
            ? [{ ...reactor, reaction }]
            : [],
    );

    const pick = (key: Filter) => {
        if (shown) setFilterState({ userId: shown.userId, key });
    };

    return (
        <BottomSheet contentClassName="gap-3" onClose={onClose} visible={target !== null}>
            {shown ? (
                <>
                    <View className="flex-row items-baseline justify-between gap-2.5 px-[18px]">
                        <Text className="font-display text-[20px] leading-[26px] tracking-[0.2px] text-text">
                            {t('sheet.title')}
                        </Text>
                        <Text
                            className="shrink font-body text-[12px] text-text-muted"
                            numberOfLines={1}>
                            {t('sheet.subtitle', { username: shown.username, count: total })}
                        </Text>
                    </View>

                    <ScrollView
                        contentContainerClassName="gap-1.5 px-[18px]"
                        horizontal
                        showsHorizontalScrollIndicator={false}>
                        <ReactionFilter
                            accessibilityLabel={t('sheet.allLabel')}
                            active={filter === 'all'}
                            label={t('sheet.all')}
                            onPress={() => pick('all')}
                        />
                        {present.map(({ key, emoji }) => (
                            <ReactionFilter
                                accessibilityLabel={t('sheet.filterLabel', {
                                    label: t(`labels.${key}`),
                                    value: liveCounts[key] ?? 0,
                                })}
                                active={filter === key}
                                emoji={emoji}
                                key={key}
                                label={String(liveCounts[key] ?? 0)}
                                onPress={() => pick(key)}
                            />
                        ))}
                    </ScrollView>

                    <ScrollView className="px-[18px]" style={{ maxHeight: window.height * 0.45 }}>
                        {reactors.isPending ? (
                            <View className="gap-2 py-1">
                                <Skeleton className="h-10" variant="block" />
                                <Skeleton className="h-10" variant="block" />
                            </View>
                        ) : reactors.isError ? (
                            <Text className="py-3 font-body text-[13px] text-text-muted">
                                {t('sheet.error')}
                            </Text>
                        ) : (
                            rows.map((reactor, index) => (
                                <ReactorRow
                                    avatarUrl={reactor.avatar_url}
                                    emoji={reactionEmoji(reactor.reaction)}
                                    isMe={reactor.user_id !== null && reactor.user_id === userId}
                                    // Un ancien membre n'a plus d'identifiant : la
                                    // position le distingue, la liste est triée par
                                    // le serveur
                                    key={reactor.user_id ?? `former-${index}`}
                                    username={reactor.username}
                                />
                            ))
                        )}
                    </ScrollView>
                </>
            ) : null}
        </BottomSheet>
    );
}
