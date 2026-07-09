import { Check, ChevronDown } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { Modal, View as RNView, useWindowDimensions } from 'react-native';

import { Badge } from '@/components/ui/badge';
import { Pressable, Text, useThemeColor, View } from '@/tw';
import { cn } from '@/tw/variants';

export type SelectOption<V extends string> = {
    value: V;
    label: string;
    /** Ligne secondaire de l'option (ex. « 6 membres ») */
    description?: string;
    /** Pill accent à droite du libellé (ex. « En cours ») */
    badge?: string;
};

type SelectProps<V extends string> = {
    options: readonly SelectOption<V>[];
    value: V;
    onChange: (value: V) => void;
    /** Libellé overline du trigger (ex. « Ligue affichée ») */
    overline: string;
    /** Icône de la tuile de gauche — passer la couleur explicitement
     * (ex. `<Users color={useThemeColor('accent')} size={18} />`) */
    icon?: React.ReactNode;
    /** Méta à droite du trigger (ex. compte de membres) */
    trailing?: string;
    accessibilityLabel?: string;
};

const OPTION_HEIGHT = 56;
const PANEL_MAX_HEIGHT = 4.5 * OPTION_HEIGHT + 12;
const PANEL_GAP = 6;

/**
 * Sélecteur du design system (maquettes Classement/Profil) : trigger carte
 * (tuile icône, overline + valeur, méta, chevron) qui ouvre une listbox
 * ancrée sous lui. Modal RN plutôt qu'un panneau absolute : un overlay en
 * zIndex se fait clipper par les ScrollView Android.
 */
export function Select<V extends string>({
    options,
    value,
    onChange,
    overline,
    icon,
    trailing,
    accessibilityLabel,
}: SelectProps<V>) {
    const [anchor, setAnchor] = useState<{ x: number; y: number; width: number } | null>(null);
    const triggerRef = useRef<RNView>(null);
    const window = useWindowDimensions();
    const accentColor = useThemeColor('accent');
    const faintColor = useThemeColor('text-faint');

    const selected = options.find((option) => option.value === value);
    const open = anchor !== null;

    const openPanel = () => {
        triggerRef.current?.measureInWindow((x, y, width, height) => {
            const panelHeight = Math.min(options.length * OPTION_HEIGHT + 12, PANEL_MAX_HEIGHT);
            const below = y + height + PANEL_GAP;
            const fitsBelow = below + panelHeight <= window.height - 16;
            setAnchor({
                x,
                y: fitsBelow ? below : Math.max(16, y - PANEL_GAP - panelHeight),
                width,
            });
        });
    };

    return (
        <>
            <RNView collapsable={false} ref={triggerRef}>
                <Pressable
                    accessibilityLabel={accessibilityLabel ?? overline}
                    accessibilityRole="button"
                    accessibilityState={{ expanded: open }}
                    className={cn(
                        'flex-row items-center gap-3 rounded-md border bg-surface px-3.5 py-[11px] tc-shadow-sm',
                        open ? 'border-accent' : 'border-border',
                    )}
                    onPress={openPanel}>
                    {icon ? (
                        <View className="h-[34px] w-[34px] items-center justify-center rounded-sm bg-accent/10">
                            {icon}
                        </View>
                    ) : null}
                    <View className="min-w-0 flex-1 gap-px">
                        <Text className="font-body-bold text-[10px] uppercase tracking-[0.6px] text-text-faint">
                            {overline}
                        </Text>
                        <Text className="font-body-bold text-[15px] text-text" numberOfLines={1}>
                            {selected?.label}
                        </Text>
                    </View>
                    {trailing ? (
                        <Text className="font-body text-[12px] text-text-muted">{trailing}</Text>
                    ) : null}
                    <View className={cn(open && 'rotate-180')}>
                        <ChevronDown color={faintColor} size={18} strokeWidth={2.2} />
                    </View>
                </Pressable>
            </RNView>

            <Modal
                animationType="fade"
                onRequestClose={() => setAnchor(null)}
                statusBarTranslucent
                transparent
                visible={open}>
                <Pressable
                    accessibilityRole="button"
                    className="flex-1"
                    onPress={() => setAnchor(null)}>
                    {anchor ? (
                        <View
                            className="absolute gap-0.5 rounded-md border border-border bg-surface p-1.5 tc-shadow-lg"
                            style={{
                                left: anchor.x,
                                top: anchor.y,
                                width: anchor.width,
                                maxHeight: PANEL_MAX_HEIGHT,
                            }}>
                            {options.map((option) => {
                                const active = option.value === value;
                                return (
                                    <Pressable
                                        accessibilityRole="button"
                                        accessibilityState={{ selected: active }}
                                        className={cn(
                                            'flex-row items-center gap-2.5 rounded-sm px-2.5 py-2.5',
                                            active && 'bg-accent/10',
                                        )}
                                        key={option.value}
                                        onPress={() => {
                                            setAnchor(null);
                                            if (!active) onChange(option.value);
                                        }}>
                                        <View className="min-w-0 flex-1 gap-px">
                                            <View className="flex-row items-center gap-2">
                                                <Text
                                                    className={cn(
                                                        'text-[14px] text-text',
                                                        active
                                                            ? 'font-body-bold'
                                                            : 'font-body-medium',
                                                    )}
                                                    numberOfLines={1}>
                                                    {option.label}
                                                </Text>
                                                {option.badge ? (
                                                    <Badge tone="accent">{option.badge}</Badge>
                                                ) : null}
                                            </View>
                                            {option.description ? (
                                                <Text className="font-body text-[11px] text-text-faint">
                                                    {option.description}
                                                </Text>
                                            ) : null}
                                        </View>
                                        {active ? (
                                            <Check
                                                color={accentColor}
                                                size={17}
                                                strokeWidth={2.6}
                                            />
                                        ) : (
                                            <View className="w-[17px]" />
                                        )}
                                    </Pressable>
                                );
                            })}
                        </View>
                    ) : null}
                </Pressable>
            </Modal>
        </>
    );
}
