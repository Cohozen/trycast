import { Check } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import { LEAGUE_COLORS, type LeagueColor } from '@/features/leagues/colors';
import { Pressable, useThemeColor, View } from '@/tw';
import { cn } from '@/tw/variants';

type LeagueColorPickerProps = {
    value: LeagueColor;
    onChange: (color: LeagueColor) => void;
};

/**
 * Swatches de couleur de ligue (maquette Créer) : pastilles rondes, anneau
 * accent sur la sélection. Les hex viennent de la palette fermée (données en
 * base) → posés en style, pas en classe.
 */
export function LeagueColorPicker({ value, onChange }: LeagueColorPickerProps) {
    const { t } = useTranslation(['leagues']);
    const checkColor = useThemeColor('cream-100');

    return (
        <View className="flex-row flex-wrap gap-2">
            {LEAGUE_COLORS.map((color) => {
                const selected = color === value;
                return (
                    <Pressable
                        accessibilityLabel={t('leagues:create.colorSwatch')}
                        accessibilityRole="radio"
                        accessibilityState={{ selected }}
                        className={cn(
                            'h-[54px] w-[54px] rounded-pill border-2 p-[3px]',
                            selected ? 'border-accent' : 'border-transparent',
                        )}
                        key={color}
                        onPress={() => onChange(color)}>
                        <View
                            className="flex-1 items-center justify-center rounded-pill"
                            style={{ backgroundColor: color }}>
                            {selected ? (
                                <Check color={checkColor} size={18} strokeWidth={3} />
                            ) : null}
                        </View>
                    </Pressable>
                );
            })}
        </View>
    );
}
