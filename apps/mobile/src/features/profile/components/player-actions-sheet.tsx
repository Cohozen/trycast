import { useTranslation } from 'react-i18next';

import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { Divider } from '@/components/ui/divider';
import { useToast } from '@/components/ui/toast-provider';
import type { ReportReason } from '@/features/profile/types';
import { useBlockPlayer } from '@/features/profile/use-block-player';
import { useReportPlayer } from '@/features/profile/use-report-player';
import { useUnblockPlayer } from '@/features/profile/use-unblock-player';
import { Text, View } from '@/tw';

type PlayerActionsSheetProps = {
    visible: boolean;
    onClose: () => void;
    /** Joueur dont on consulte le profil (jamais soi-même). */
    userId: string;
    /** Déjà bloqué : le volet propose de débloquer. */
    isBlocked: boolean;
};

/**
 * Volet des actions sur le profil public d'un joueur (règle 1.2 de l'App
 * Store) : signaler son pseudo ou sa photo, le bloquer ou le débloquer. Les
 * motifs de signalement sont une liste fermée, sans texte libre ; le
 * traitement est manuel, à partir de l'e-mail que reçoit contact@.
 */
export function PlayerActionsSheet({
    visible,
    onClose,
    userId,
    isBlocked,
}: PlayerActionsSheetProps) {
    const { t } = useTranslation(['profile', 'common']);
    const toast = useToast();
    const report = useReportPlayer();
    const block = useBlockPlayer();
    const unblock = useUnblockPlayer();
    const busy = report.isPending || block.isPending || unblock.isPending;

    const done = (message: string) => {
        onClose();
        toast.show(message, 'success');
    };
    const failed = () => toast.show(t('common:errors.generic'), 'neutral');

    const sendReport = (reason: ReportReason) =>
        report.mutate(
            { reportedId: userId, reason },
            { onSuccess: () => done(t('profile:playerActions.reported')), onError: failed },
        );

    const toggleBlock = () =>
        isBlocked
            ? unblock.mutate(userId, {
                  onSuccess: () => done(t('profile:playerActions.unblocked')),
                  onError: failed,
              })
            : block.mutate(userId, {
                  onSuccess: () => done(t('profile:playerActions.blocked')),
                  onError: failed,
              });

    return (
        <BottomSheet
            backdropOpacity={0.5}
            bottomInset={24}
            contentClassName="gap-5 px-5"
            onClose={onClose}
            visible={visible}>
            <View className="gap-3">
                <View className="gap-1.5">
                    <Text className="font-display text-2xl leading-7 text-text">
                        {t('profile:playerActions.reportTitle')}
                    </Text>
                    <Text className="font-body text-[14px] leading-5 text-text-muted">
                        {t('profile:playerActions.reportIntro')}
                    </Text>
                </View>
                <Button
                    disabled={busy}
                    fullWidth
                    onPress={() => sendReport('username')}
                    title={t('profile:playerActions.reportUsername')}
                    variant="secondary"
                />
                <Button
                    disabled={busy}
                    fullWidth
                    onPress={() => sendReport('avatar')}
                    title={t('profile:playerActions.reportAvatar')}
                    variant="secondary"
                />
            </View>

            <Divider />

            <View className="gap-3">
                <View className="gap-1.5">
                    <Text className="font-display text-2xl leading-7 text-text">
                        {t('profile:playerActions.blockTitle')}
                    </Text>
                    <Text className="font-body text-[14px] leading-5 text-text-muted">
                        {isBlocked
                            ? t('profile:playerActions.unblockIntro')
                            : t('profile:playerActions.blockIntro')}
                    </Text>
                </View>
                <Button
                    disabled={busy}
                    fullWidth
                    loading={block.isPending || unblock.isPending}
                    onPress={toggleBlock}
                    title={
                        isBlocked
                            ? t('profile:playerActions.unblock')
                            : t('profile:playerActions.block')
                    }
                    variant={isBlocked ? 'secondary' : 'danger-outline'}
                />
            </View>
        </BottomSheet>
    );
}
