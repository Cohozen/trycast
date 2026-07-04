import type { Database } from '@/lib/database.types';

export type PredictionRow = Database['public']['Tables']['predictions']['Row'];

/** Saisie d'un prono côté client (les points restent l'affaire du scoring serveur). */
export type PredictionDraft = {
    match_id: string;
    predicted_home_score: number;
    predicted_away_score: number;
    predicted_bonus_off_home: boolean;
    predicted_bonus_off_away: boolean;
};

/** Pronos indexés par match pour la liste des matchs et les résultats. */
export type PredictionsByMatch = Map<string, PredictionRow>;
