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
        <View className="items-center gap-3 px-7 py-8">
            {icon ? (
                <View className="mb-1 h-18 w-18 items-center justify-center rounded-pill bg-brand/10">
                    {icon}
                </View>
            ) : null}
            {/* leading-[26px] et pas `leading-1`, qui vaut calc(--spacing * 1)
                soit ~3.5px en natif : les ascendantes d'Anton s'y font rogner */}
            <Text className="text-center font-display text-h2 leading-[26px] text-text">
                {title}
            </Text>
            {message ? (
                <Text className="max-w-[280px] text-center font-body text-[14px] leading-[21px] text-text-muted">
                    {message}
                </Text>
            ) : null}
            {/* w-full : sans largeur définie ici, le parent `items-center` laisse
                l'action se dimensionner sur son contenu et un enfant `w-full`
                se résout alors sur son propre texte — deux boutons empilés
                sortent de largeurs différentes, libellés désalignés. */}
            {action ? <View className="mt-2 w-full items-center">{action}</View> : null}
        </View>
    );
}
