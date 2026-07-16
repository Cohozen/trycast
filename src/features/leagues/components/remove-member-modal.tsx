import { useTranslation } from 'react-i18next';
import { Modal } from 'react-native';

import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Text, View } from '@/tw';

type RemoveMemberModalProps = {
    visible: boolean;
    /** Membre visé ; null quand la modale est fermée. */
    member: { username: string; avatarUrl: string | null } | null;
    leagueName: string;
    removing: boolean;
    onConfirm: () => void;
    onCancel: () => void;
};

/**
 * Confirmation d'exclusion d'un membre (maquette Détail Ligue) : action
 * réversible (le code permet de revenir) → confirmation simple, l'avatar
 * rappelle qui est visé.
 */
export function RemoveMemberModal({
    visible,
    member,
    leagueName,
    removing,
    onConfirm,
    onCancel,
}: RemoveMemberModalProps) {
    const { t } = useTranslation(['leagues', 'common']);
    if (!member) return null;

    return (
        <Modal animationType="fade" onRequestClose={onCancel} transparent visible={visible}>
            <View className="flex-1 items-center justify-center bg-[#0B1A11]/50 p-4">
                <View className="w-full max-w-[420px] overflow-hidden rounded-lg bg-surface tc-shadow-lg">
                    <View className="items-center gap-3 px-5 pb-2 pt-6">
                        <Avatar name={member.username} size="lg" uri={member.avatarUrl} />
                        <Text className="text-center font-display text-[24px] leading-[26px] text-text">
                            {t('leagues:detail.kick.title', { username: member.username })}
                        </Text>
                        <Text className="text-center font-body text-[13.5px] leading-[20px] text-text-muted">
                            {t('leagues:detail.kick.message', {
                                username: member.username,
                                name: leagueName,
                            })}
                        </Text>
                    </View>
                    <View className="gap-2.5 px-5 pb-4 pt-4">
                        <Button
                            fullWidth
                            loading={removing}
                            onPress={onConfirm}
                            title={t('leagues:detail.kick.confirm')}
                            variant="danger"
                        />
                        <Button
                            disabled={removing}
                            fullWidth
                            onPress={onCancel}
                            title={t('common:actions.cancel')}
                            variant="ghost"
                        />
                    </View>
                </View>
            </View>
        </Modal>
    );
}
