// Miroir des contraintes SQL de predictions (scores entiers ≥ 0)

/** Clé i18n d'une erreur de validation de score, à passer à t() côté écran. */
export type ScoreValidationKey =
    | 'predictions:validation.missingScore'
    | 'predictions:validation.invalidScore';

export function validatePredictedScore(raw: string): ScoreValidationKey | null {
    if (raw.trim() === '') {
        return 'predictions:validation.missingScore';
    }
    if (!/^\d+$/.test(raw.trim())) {
        return 'predictions:validation.invalidScore';
    }
    return null;
}

/** Parse un champ de score déjà validé (chiffres uniquement). */
export function parsePredictedScore(raw: string): number {
    return Number.parseInt(raw.trim(), 10);
}
