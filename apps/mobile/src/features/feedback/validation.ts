/** Bornes du message libre, après trim. */
export const FEEDBACK_MIN_LENGTH = 10;
export const FEEDBACK_MAX_LENGTH = 2000;

/** Clé i18n d'une erreur de validation du signalement, à passer à t() côté écran. */
export type FeedbackValidationKey = 'feedback:validation.tooShort' | 'feedback:validation.tooLong';

export function validateFeedbackMessage(raw: string): FeedbackValidationKey | null {
    const message = raw.trim();
    if (message.length < FEEDBACK_MIN_LENGTH) {
        return 'feedback:validation.tooShort';
    }
    if (message.length > FEEDBACK_MAX_LENGTH) {
        return 'feedback:validation.tooLong';
    }
    return null;
}
