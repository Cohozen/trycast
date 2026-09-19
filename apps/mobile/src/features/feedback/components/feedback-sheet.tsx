import { Info } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { TextField } from '@/components/ui/text-field';
import { Text, useThemeColor, View } from '@/tw';

import { FEEDBACK_MAX_LENGTH, validateFeedbackMessage } from '../validation';

type FeedbackSheetProps = {
    visible: boolean;
    /** Adresse de la session ; null masque la case (compte sans e-mail). */
    email: string | null;
    onClose: () => void;
    onSubmit: (message: string, attachEmail: boolean) => void;
};

/**
 * Sheet « Signaler un problème » : message libre, case e-mail (cochée par
 * défaut, l'adresse affichée pour que le choix soit éclairé) et mention des
 * infos techniques jointes. La validation ne s'affiche qu'après une première
 * tentative d'envoi, pour ne pas crier sur un champ qu'on commence à remplir.
 */
export function FeedbackSheet({ visible, email, onClose, onSubmit }: FeedbackSheetProps) {
    const { t } = useTranslation(['feedback']);
    const faintColor = useThemeColor('text-faint');
    const [message, setMessage] = useState('');
    const [attachEmail, setAttachEmail] = useState(true);
    const [submitted, setSubmitted] = useState(false);

    // Chaque ouverture repart d'une feuille blanche (motif React « ajuster un
    // état sur changement de prop », comme le guide d'accueil).
    const [wasVisible, setWasVisible] = useState(visible);
    if (visible !== wasVisible) {
        setWasVisible(visible);
        if (visible) {
            setMessage('');
            setAttachEmail(true);
            setSubmitted(false);
        }
    }

    const error = validateFeedbackMessage(message);

    const send = () => {
        setSubmitted(true);
        if (error) return;
        onSubmit(message, attachEmail);
    };

    return (
        <BottomSheet
            avoidKeyboard
            backdropOpacity={0.5}
            bottomInset={24}
            contentClassName="gap-4 px-5"
            onClose={onClose}
            visible={visible}>
            <View className="gap-1.5">
                <Text className="font-display text-2xl leading-7 text-text">
                    {t('feedback:title')}
                </Text>
                <Text className="font-body text-[14px] leading-5 text-text-muted">
                    {t('feedback:intro')}
                </Text>
            </View>

            <View className="gap-1.5">
                <TextField
                    accessibilityLabel={t('feedback:label')}
                    error={submitted && error ? t(error) : null}
                    maxLength={FEEDBACK_MAX_LENGTH}
                    multiline
                    onChangeText={setMessage}
                    placeholder={t('feedback:placeholder')}
                    value={message}
                />
                <Text className="self-end font-body text-caption text-text-faint">
                    {t('feedback:counter', {
                        count: message.trim().length,
                        max: FEEDBACK_MAX_LENGTH,
                    })}
                </Text>
            </View>

            {email ? (
                <View className="flex-row items-center gap-3">
                    <View className="min-w-0 flex-1 gap-0.5">
                        <Text className="font-body-semibold text-[14px] text-text">
                            {t('feedback:attachEmail')}
                        </Text>
                        <Text className="font-body text-[13px] text-text-muted" numberOfLines={1}>
                            {email}
                        </Text>
                    </View>
                    <Switch
                        accessibilityLabel={t('feedback:attachEmail')}
                        checked={attachEmail}
                        onToggle={() => setAttachEmail((v) => !v)}
                    />
                </View>
            ) : null}

            <View className="flex-row gap-2">
                <Info color={faintColor} size={15} strokeWidth={1.9} />
                <Text className="min-w-0 flex-1 font-body text-caption text-text-faint">
                    {t('feedback:technicalInfo')}
                </Text>
            </View>

            <Button fullWidth onPress={send} title={t('feedback:send')} />
        </BottomSheet>
    );
}
