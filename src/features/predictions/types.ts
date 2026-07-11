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

/** Agrégat communautaire 1/N/2 d'un match (seule sortie de la RPC : jamais de prono individuel). */
export type PredictionDistribution = {
    home: number;
    draw: number;
    away: number;
    total: number;
};

/** Distributions indexées par match (RPC batch par compétition). */
export type DistributionsByMatch = Map<string, PredictionDistribution>;
