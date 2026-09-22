import type { Database } from '@/lib/database.types';

export type LeagueRow = Database['public']['Tables']['leagues']['Row'];

/** Ligne de classement servie par les RPC (général et ligue, même forme). */
export type LeaderboardEntry =
    Database['public']['Functions']['get_global_leaderboard']['Returns'][number];

/** Aperçu d'une ligue résolue par code, avant adhésion (sheet Rejoindre). */
export type LeaguePreview = Database['public']['Functions']['preview_league']['Returns'][number];

/** Points d'un membre sur une journée (onglet Résultats du détail de ligue). */
export type LeagueRoundPointsRow =
    Database['public']['Functions']['get_league_round_points']['Returns'][number];

/** Lauréat d'un coup de la journée (RPC get_league_round_highlights). */
export type RoundHighlightRow =
    Database['public']['Functions']['get_league_round_highlights']['Returns'][number];

/** Étape à élimination directe d'une compétition (fenêtre de dates). */
export type CompetitionStage = Database['public']['Tables']['competition_stages']['Row'];

/** Nature d'une étape — miroir du `check` SQL de competition_stages.kind. */
export type StageKind = 'r16' | 'qf' | 'sf' | 'final' | 'finals';

/** Pilule de la bande Journées & phases finales (onglet Résultats). */
export type RoundStripItem = {
    /** Clé stable du groupe (cf. roundGroupKey). */
    key: string;
    /** Journée de poule, ou nature de l'étape à élimination directe. */
    kind: 'round' | StageKind;
    /** Libellé brut du round (« 1 », « 2 »…) ; vide pour une étape. */
    label: string;
    /** Au moins un match terminé (des points existent). */
    played: boolean;
    /** Dernier groupe joué : cerclé quand il n'est pas sélectionné. */
    emphasized: boolean;
    /** Premier coup d'envoi du groupe (ISO). */
    firstKickoff: string;
    matchCount: number;
};
