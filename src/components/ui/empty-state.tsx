import { Text, View } from '@/tw';

type EmptyStateProps = {
    title: string;
    message?: string;
    /** Icône optionnelle, posée dans une pastille brand */
    icon?: React.ReactNode;
    /** Action optionnelle (ex. un <Button />) rendue sous le message */
    action?: React.ReactNode;
};

/** État vide du design system : titre Anton, message court, action éventuelle. */
export function EmptyState({ title, message, icon, action }: EmptyStateProps) {
    return (
        <View className="items-center gap-3 px-7 py-10">
            {icon ? (
                <View className="mb-1 h-[72px] w-[72px] items-center justify-center rounded-pill bg-brand/10">
                    {icon}
                </View>
            ) : null}
            <Text className="text-center font-display text-h2 text-text">{title}</Text>
            {message ? (
                <Text className="max-w-[280px] text-center font-body text-[14px] leading-[21px] text-text-muted">
                    {message}
                </Text>
            ) : null}
            {action ? <View className="mt-2">{action}</View> : null}
        </View>
    );
}
