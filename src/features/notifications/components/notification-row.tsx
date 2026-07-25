import { CalendarClock, Trophy } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Card } from '@/components/ui/card';
import { Pressable, Text, useThemeColor, View } from '@/tw';
import { cn } from '@/tw/variants';
import { formatNotificationTime } from '../format-notification-time';
import type { AppNotification } from '../types';

type NotificationRowProps = {
    notification: AppNotification;
    onPress: () => void;
};

/**
 * Une notification de l'historique. Lue = même contenu, en retrait (opacité) :
 * l'historique ne se vide jamais, il se patine. La pastille grenat marque le
 * non-lu — l'accent est une étincelle, une pastille de 8 px en est une.
 */
export function NotificationRow({ notification, onPress }: NotificationRowProps) {
    const { i18n } = useTranslation();
    const [pressed, setPressed] = useState(false);
    const iconColor = useThemeColor('text-muted');
    const isRead = !!notification.read_at;
    const Icon = notification.type === 'result' ? Trophy : CalendarClock;

    return (
        <Pressable
            accessibilityRole="button"
            className={cn('will-change-variable', pressed && 'scale-[0.99]')}
            onPress={onPress}
            onPressIn={() => setPressed(true)}
            onPressOut={() => setPressed(false)}>
            <Card className={cn('flex-row gap-3', isRead && 'opacity-55')}>
                <View className="h-9 w-9 items-center justify-center rounded-pill bg-brand/10">
                    <Icon color={iconColor} size={18} strokeWidth={1.9} />
                </View>
                <View className="min-w-0 flex-1 gap-0.5">
                    <View className="flex-row items-center gap-2">
                        <Text className="min-w-0 flex-1 font-body-semibold text-[14.5px] text-text">
                            {notification.title}
                        </Text>
                        {isRead ? null : <View className="h-2 w-2 rounded-pill bg-accent" />}
                    </View>
                    <Text className="font-body text-[13.5px] leading-[19px] text-text-muted">
                        {notification.body}
                    </Text>
                    <Text className="mt-0.5 font-body text-[11.5px] text-text-faint">
                        {formatNotificationTime(notification.created_at, i18n.language)}
                    </Text>
                </View>
            </Card>
        </Pressable>
    );
}
