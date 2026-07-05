import type { LeaderboardEntry } from '@/features/leagues/types';
import { Text, View } from '@/tw';

type LeaderboardRowProps = {
    entry: LeaderboardEntry;
    /** Met en évidence la ligne de l'utilisateur connecté. */
    isMe: boolean;
};

/** Ligne de classement (général ou ligue) : rang, pseudo, points. */
export function LeaderboardRow({ entry, isMe }: LeaderboardRowProps) {
    return (
        <View
            className={`flex-row items-center gap-3 rounded-xl px-4 py-3 ${
                isMe ? 'bg-emerald-50' : 'bg-white'
            }`}>
            <Text className="w-8 text-base font-bold text-gray-500">{entry.rank}</Text>
            <View className="flex-1">
                <Text
                    className={`text-base ${isMe ? 'font-bold text-emerald-900' : 'text-gray-900'}`}>
                    {entry.username}
                </Text>
                <Text className="text-xs text-gray-500">
                    {entry.predictions_scored} prono{entry.predictions_scored > 1 ? 's' : ''}
                    {entry.exact_scores > 0
                        ? ` · ${entry.exact_scores} score${entry.exact_scores > 1 ? 's' : ''} exact${entry.exact_scores > 1 ? 's' : ''}`
                        : ''}
                </Text>
            </View>
            <Text className="text-base font-semibold text-gray-900">{entry.total_points} pts</Text>
        </View>
    );
}
