import { NotificationsBell } from '@/components/notifications-bell';
import { ReportProblemButton } from '@/components/report-problem-button';
import { View } from '@/tw';

/** Actions en haut à droite des onglets : signaler un problème, puis la cloche. */
export function HeaderActions() {
    return (
        <View className="flex-row items-center gap-2">
            <ReportProblemButton />
            <NotificationsBell />
        </View>
    );
}
