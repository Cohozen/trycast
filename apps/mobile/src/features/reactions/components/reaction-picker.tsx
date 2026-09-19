import { useTranslation } from 'react-i18next';

import { ReactionPickerOption } from '@/features/reactions/components/reaction-picker-option';
import { REACTIONS, type ReactionKey } from '@/features/reactions/reactions';
import { View } from '@/tw';

type ReactionPickerProps = {
    /** Ma réaction actuelle sur ce prono, mise en évidence. */
    selected: ReactionKey | null;
    onPick: (key: ReactionKey) => void;
};

/** Les quatre réactions, dans l'ordre fixe, contenu du popover. */
export function ReactionPicker({ selected, onPick }: ReactionPickerProps) {
    const { t } = useTranslation('reactions');
    return (
        <View accessibilityRole="menu" className="flex-row gap-0.5 p-[5px]">
            {REACTIONS.map(({ key, emoji }) => (
                <ReactionPickerOption
                    accessibilityLabel={t('picker.react', { label: t(`labels.${key}`) })}
                    emoji={emoji}
                    key={key}
                    onPress={() => onPick(key)}
                    selected={selected === key}
                />
            ))}
        </View>
    );
}
