import { User } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import { Avatar } from '@/components/ui/avatar';
import { ReactionEmoji } from '@/features/reactions/components/reaction-emoji';
import { Text, useThemeColor, View } from '@/tw';
import { cn } from '@/tw/variants';

type ReactorRowProps = {
    /** null : ancien membre de la ligue, anonymisé par le serveur. */
    username: string | null;
    avatarUrl: string | null;
    emoji: string;
    isMe: boolean;
};

/**
 * Un auteur de réaction dans la sheet. Un ancien membre n'a plus de nom ni
 * d'avatar (la RPC les masque) : pastille en pointillés et mention « A quitté
 * la ligue » — sa réaction reste comptée (décision 2026-09-19).
 */
export function ReactorRow({ username, avatarUrl, emoji, isMe }: ReactorRowProps) {
    const { t } = useTranslation('reactions');
    const faintColor = useThemeColor('text-faint');
    const former = username === null;

    return (
        <View className="flex-row items-center gap-3 border-b border-border py-[9px]">
            {former ? (
                <View className="h-8 w-8 items-center justify-center rounded-pill bg-surface-sunken">
                    {/* Pointillés dans leur propre vue sans enfant : posé sur un
                        conteneur, react-native-css propage le dashed aux
                        descendants (cf. skill design system) */}
                    <View className="absolute inset-0 rounded-pill border border-dashed border-border-strong" />
                    <User color={faintColor} size={15} strokeWidth={2} />
                </View>
            ) : (
                <Avatar name={username} ring={isMe} size="sm" uri={avatarUrl} />
            )}
            <View className="min-w-0 flex-1 gap-px">
                <Text
                    className={cn(
                        'text-[14px]',
                        former
                            ? 'font-body-medium text-text-faint'
                            : isMe
                              ? 'font-body-bold text-text'
                              : 'font-body-medium text-text',
                    )}
                    numberOfLines={1}>
                    {former
                        ? t('sheet.formerMember')
                        : isMe
                          ? t('sheet.you', { username })
                          : username}
                </Text>
                {former ? (
                    <Text className="font-body text-[11px] text-text-faint">
                        {t('sheet.formerMemberNote')}
                    </Text>
                ) : null}
            </View>
            <ReactionEmoji emoji={emoji} size="sheet" />
        </View>
    );
}
