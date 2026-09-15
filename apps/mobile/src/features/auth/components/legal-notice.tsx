import * as WebBrowser from 'expo-web-browser';
import { useTranslation } from 'react-i18next';

import { legalUrl } from '@/lib/urls';
import { Text } from '@/tw';

/**
 * Mention affichée sous le bouton d'inscription. La création de compte a pour
 * base légale l'exécution du contrat, pas le consentement : c'est une mention
 * informative, jamais une case à cocher (une case obligatoire ne serait pas un
 * consentement libre au sens du RGPD). La phrase est découpée en fragments
 * parce que les liens sont des `Text` imbriqués — il n'y a pas de `Trans` dans
 * le projet. Les pages s'ouvrent dans la langue de l'app.
 */
export function LegalNotice() {
    const { t, i18n } = useTranslation(['common']);

    return (
        <Text className="text-center font-body text-[12px] leading-[17px] text-text-faint">
            {t('common:legal.signupNotice.before')}
            <Text
                accessibilityRole="link"
                className="font-body-medium text-text-muted underline"
                onPress={() =>
                    WebBrowser.openBrowserAsync(legalUrl('terms', i18n.resolvedLanguage))
                }>
                {t('common:legal.signupNotice.terms')}
            </Text>
            {t('common:legal.signupNotice.between')}
            <Text
                accessibilityRole="link"
                className="font-body-medium text-text-muted underline"
                onPress={() =>
                    WebBrowser.openBrowserAsync(legalUrl('privacy', i18n.resolvedLanguage))
                }>
                {t('common:legal.signupNotice.privacy')}
            </Text>
            {t('common:legal.signupNotice.after')}
        </Text>
    );
}
