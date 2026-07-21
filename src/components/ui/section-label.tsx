import { Text } from '@/tw';

/** Label majuscule de section d'écran (réglages, règles…), variante danger. */
export function SectionLabel({ children, danger = false }: { children: string; danger?: boolean }) {
    return (
        <Text
            className={
                danger
                    ? 'px-1.5 font-body-bold text-[11px] uppercase tracking-[1px] text-danger'
                    : 'px-1.5 font-body-bold text-[11px] uppercase tracking-[1px] text-text-faint'
            }>
            {children}
        </Text>
    );
}
