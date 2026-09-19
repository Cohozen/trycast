import { MessageSquareWarning } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import { IconButton } from '@/components/ui/icon-button';
import { useFeedback } from '@/features/feedback/components/feedback-provider';
import { useThemeColor } from '@/tw';

/**
 * Ouvre la sheet « Signaler un problème ». Rien n'est rendu sans DSN Sentry :
 * le signalement n'aurait nulle part où partir.
 */
export function ReportProblemButton() {
    const { t } = useTranslation(['feedback']);
    const { available, open } = useFeedback();
    const textColor = useThemeColor('text');

    if (!available) return null;

    return (
        <IconButton accessibilityLabel={t('feedback:button')} onPress={open} variant="soft">
            <MessageSquareWarning color={textColor} size={20} strokeWidth={1.9} />
        </IconButton>
    );
}
