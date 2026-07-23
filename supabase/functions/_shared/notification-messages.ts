// Contenus localisés des notifications push (Lot 6). Ajouter une langue = une
// entrée dans MESSAGES. La locale vient de profiles.locale (synchronisée au
// login par l'app), repli fr pour toute locale inconnue. Module pur (zéro
// import Deno) : testé sous Vitest.

export type NotificationContent = {
    title: string;
    body: string;
};

// Cibles des deep links portées par le payload `data.url` de chaque message.
// L'app n'accepte que ces routes (allowlist dans use-notification-observer) :
// toute nouvelle URL ici doit y être ajoutée.
export const REMINDER_URL = '/(app)/(tabs)/';
export const RESULT_URL = '/(app)/(tabs)/results';

/**
 * Noms d'équipes : `teams.name` est le nom API, donc anglais. Les nations
 * connues sont traduites par tricode (`teams.code`), comme l'app le fait avec
 * teamName() et les clés `matches:teams.<code>` — la table FR ci-dessous est
 * la copie serveur de `src/locales/fr/matches.json`, tenue par un test de
 * parité. Toute équipe hors table (code null, nation non couverte) garde son
 * nom brut : c'est déjà le comportement de l'app.
 */
const TEAM_NAMES_FR: Record<string, string> = {
    FRA: 'France',
    IRL: 'Irlande',
    ITA: 'Italie',
    ARG: 'Argentine',
    JPN: 'Japon',
    ENG: 'Angleterre',
    SCO: 'Écosse',
    WAL: 'Pays de Galles',
    NZL: 'Nouvelle-Zélande',
    AUS: 'Australie',
    RSA: 'Afrique du Sud',
    FIJ: 'Fidji',
};

// L'anglais n'a rien à traduire : le nom API est déjà anglais.
const TEAM_NAMES_EN: Record<string, string> = {};

/** Une équipe telle que la rendent les RPC notify_*_targets. */
export type TeamRef = { name: string; code?: string | null };

type ReminderParams = { home: TeamRef; away: TeamRef };
type ResultParams = {
    home: TeamRef;
    away: TeamRef;
    homeScore: number;
    awayScore: number;
    points: number;
};

type LocaleMessages = {
    reminderTitle: string;
    reminderBody: (params: { homeTeam: string; awayTeam: string }) => string;
    resultTitle: string;
    resultBody: (params: {
        homeTeam: string;
        awayTeam: string;
        homeScore: number;
        awayScore: number;
        points: number;
    }) => string;
    teamNames: Record<string, string>;
};

const MESSAGES: Record<string, LocaleMessages> = {
    fr: {
        reminderTitle: 'Rappel de prono',
        reminderBody: ({ homeTeam, awayTeam }) =>
            `${homeTeam} – ${awayTeam} : coup d'envoi dans moins d'une heure. Fais ton prono !`,
        resultTitle: 'Résultats & points',
        resultBody: ({ homeTeam, awayTeam, homeScore, awayScore, points }) =>
            `${homeTeam} ${homeScore} – ${awayScore} ${awayTeam} : tu marques ${formatPointsFr(points)}.`,
        teamNames: TEAM_NAMES_FR,
    },
    en: {
        reminderTitle: 'Prediction reminder',
        reminderBody: ({ homeTeam, awayTeam }) =>
            `${homeTeam} – ${awayTeam}: kickoff in under an hour. Make your prediction!`,
        resultTitle: 'Results & points',
        resultBody: ({ homeTeam, awayTeam, homeScore, awayScore, points }) =>
            `${homeTeam} ${homeScore} – ${awayScore} ${awayTeam}: you score ${formatPointsEn(points)}.`,
        teamNames: TEAM_NAMES_EN,
    },
};

function formatPointsFr(points: number): string {
    return `${points} ${points > 1 ? 'pts' : 'pt'}`;
}

function formatPointsEn(points: number): string {
    return `${points} ${points === 1 ? 'pt' : 'pts'}`;
}

/** « fr-FR » → fr ; locale inconnue ou absente → fr. */
function resolveMessages(locale: string | null): LocaleMessages {
    const base = (locale ?? '').toLowerCase().split('-')[0];
    return MESSAGES[base] ?? MESSAGES.fr;
}

/** Nom affiché d'une équipe : traduction par tricode, sinon le nom brut. */
function teamLabel(messages: LocaleMessages, team: TeamRef): string {
    return (team.code ? messages.teamNames[team.code] : undefined) ?? team.name;
}

export function buildReminderMessage(
    locale: string | null,
    params: ReminderParams,
): NotificationContent {
    const messages = resolveMessages(locale);
    return {
        title: messages.reminderTitle,
        body: messages.reminderBody({
            homeTeam: teamLabel(messages, params.home),
            awayTeam: teamLabel(messages, params.away),
        }),
    };
}

export function buildResultMessage(
    locale: string | null,
    params: ResultParams,
): NotificationContent {
    const messages = resolveMessages(locale);
    return {
        title: messages.resultTitle,
        body: messages.resultBody({
            homeTeam: teamLabel(messages, params.home),
            awayTeam: teamLabel(messages, params.away),
            homeScore: params.homeScore,
            awayScore: params.awayScore,
            points: params.points,
        }),
    };
}
