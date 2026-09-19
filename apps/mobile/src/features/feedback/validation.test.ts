import { describe, expect, it } from 'vitest';

import { FEEDBACK_MAX_LENGTH, FEEDBACK_MIN_LENGTH, validateFeedbackMessage } from './validation';

describe('validateFeedbackMessage', () => {
    it('refuse un message trop court, espaces exclus', () => {
        expect(validateFeedbackMessage('')).toBe('feedback:validation.tooShort');
        expect(validateFeedbackMessage(`   ${'a'.repeat(FEEDBACK_MIN_LENGTH - 1)}   `)).toBe(
            'feedback:validation.tooShort',
        );
    });

    it('accepte les bornes exactes', () => {
        expect(validateFeedbackMessage('a'.repeat(FEEDBACK_MIN_LENGTH))).toBeNull();
        expect(validateFeedbackMessage('a'.repeat(FEEDBACK_MAX_LENGTH))).toBeNull();
    });

    it('refuse un message trop long', () => {
        expect(validateFeedbackMessage('a'.repeat(FEEDBACK_MAX_LENGTH + 1))).toBe(
            'feedback:validation.tooLong',
        );
    });
});
