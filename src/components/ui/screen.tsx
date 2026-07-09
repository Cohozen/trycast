import { ScrollView } from '@/tw';
import { cn } from '@/tw/variants';

type ScreenProps = {
    children: React.ReactNode;
    /** Classes du conteneur de contenu (padding, gap…) */
    contentClassName?: string;
    className?: string;
};

/**
 * Conteneur d'écran du design system : fond thème, scroll, contenu centré
 * à 800px max (confort web/tablette). Les écrans sous tab bar ajoutent leur
 * padding bas via contentClassName.
 */
export function Screen({ children, contentClassName, className }: ScreenProps) {
    return (
        <ScrollView
            className={cn('flex-1 bg-bg', className)}
            contentContainerClassName={cn(
                'w-full max-w-[800px] self-center px-5 pb-10 pt-16 gap-4',
                contentClassName,
            )}>
            {children}
        </ScrollView>
    );
}
