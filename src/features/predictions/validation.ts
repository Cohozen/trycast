// Miroir des contraintes SQL de predictions (scores entiers ≥ 0)

export function validatePredictedScore(raw: string): string | null {
    if (raw.trim() === '') {
        return 'Indique un score.';
    }
    if (!/^\d+$/.test(raw.trim())) {
        return 'Le score doit être un nombre entier positif.';
    }
    return null;
}

/** Parse un champ de score déjà validé (chiffres uniquement). */
export function parsePredictedScore(raw: string): number {
    return Number.parseInt(raw.trim(), 10);
}
