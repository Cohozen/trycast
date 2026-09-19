import * as Sentry from '@sentry/react-native';

import { recentErrorEventId } from './recent-error';
import type { FeedbackSentryContext } from './types';

type SendFeedbackInput = {
    message: string;
    context: FeedbackSentryContext;
    /**
     * Présent seulement si le testeur a coché « Joindre mon e-mail ». Le
     * pseudo suit le même consentement : c'est le même « on peut te
     * recontacter ».
     */
    contact?: { email: string; name?: string };
};

/** Faux sans DSN : le bouton n'est alors proposé nulle part (CI, clone frais). */
export const isFeedbackAvailable = Boolean(process.env.EXPO_PUBLIC_SENTRY_DSN);

/**
 * Envoie le signalement à Sentry (User Feedback).
 *
 * L'identité ne passe **que** par les champs de ce feedback, jamais par
 * `Sentry.setUser` : les rapports de plantage restent anonymes, comme le
 * promet la politique de confidentialité.
 *
 * Un feedback ne traverse pas `beforeSend` (réservé aux erreurs par
 * `@sentry/core`) : il part même quand les diagnostics sont coupés. C'est
 * voulu — l'envoi est un geste explicite de l'utilisateur. L'envoi est
 * mis en file par le SDK, qui le réessaie hors ligne.
 */
export function sendFeedback({ message, context, contact }: SendFeedbackInput): void {
    Sentry.withScope((scope) => {
        scope.setContext('screen', context.context);
        Sentry.captureFeedback(
            {
                message: message.trim(),
                email: contact?.email,
                name: contact?.name,
                url: context.url,
                source: 'app',
                tags: context.tags,
                associatedEventId: recentErrorEventId(),
            },
            {},
            scope,
        );
    });
}
