// Contenus localisés des notifications push (Lot 6). FR est la seule langue
// livrée ; ajouter une langue = une entrée dans MESSAGES. La locale vient de
// profiles.locale (synchronisée au login par l'app), repli fr pour toute
// locale inconnue. Module pur (zéro import Deno) : testé sous Vitest.

export type NotificationContent = {
    title: string;
    body: string;
};

// Cibles des deep links portées par le payload `data.url` de chaque message.
// L'app n'accepte que ces routes (allowlist dans use-notification-observer) :
// toute nouvelle URL ici doit y être ajoutée.
export const REMINDER_URL = '/(app)/(tabs)/';
export const RESULT_URL = '/(app)/(tabs)/results';

type ReminderParams = { homeTeam: string; awayTeam: string };
type ResultParams = {
    homeTeam: string;
    awayTeam: string;
    homeScore: number;
    awayScore: number;
    points: number;
};

type LocaleMessages = {
    reminderTitle: string;
    reminderBody: (params: ReminderParams) => string;
    resultTitle: string;
    resultBody: (params: ResultParams) => string;
};

const MESSAGES: Record<string, LocaleMessages> = {
    fr: {
        reminderTitle: 'Rappel de prono',
        reminderBody: ({ homeTeam, awayTeam }) =>
            `${homeTeam} – ${awayTeam} : coup d'envoi dans moins d'une heure. Fais ton prono !`,
        resultTitle: 'Résultats & points',
        resultBody: ({ homeTeam, awayTeam, homeScore, awayScore, points }) =>
            `${homeTeam} ${homeScore} – ${awayScore} ${awayTeam} : tu marques ${formatPointsFr(points)}.`,
    },
};

function formatPointsFr(points: number): string {
    return `${points} ${points > 1 ? 'pts' : 'pt'}`;
}

/** « fr-FR » → fr ; locale inconnue ou absente → fr. */
function resolveMessages(locale: string | null): LocaleMessages {
    const base = (locale ?? '').toLowerCase().split('-')[0];
    return MESSAGES[base] ?? MESSAGES.fr;
}

export function buildReminderMessage(
    locale: string | null,
    params: ReminderParams,
): NotificationContent {
    const messages = resolveMessages(locale);
    return { title: messages.reminderTitle, body: messages.reminderBody(params) };
}

export function buildResultMessage(
    locale: string | null,
    params: ResultParams,
): NotificationContent {
    const messages = resolveMessages(locale);
    return { title: messages.resultTitle, body: messages.resultBody(params) };
}
