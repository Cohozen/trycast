import { useTranslation } from 'react-i18next';

import { CodeInput } from '@/components/ui/code-input';

type InviteCodeInputProps = {
    /** Code déjà filtré (0 à 8 caractères de l'alphabet du serveur). */
    value: string;
    onChange: (value: string) => void;
    /** Peint les cases en erreur (code inconnu côté serveur). */
    error?: boolean;
};

// Alphabet du check invite_code (pas de 0/O/1/I/L) — miroir de
// normalizeInviteCode ; on filtre à la saisie, la validation reste serveur.
const FORBIDDEN = /[^A-HJ-KM-NP-Z2-9]/g;

export function sanitizeInviteCodeInput(raw: string): string {
    return raw.toUpperCase().replaceAll(FORBIDDEN, '').slice(0, 8);
}

/** Saisie du code d'invitation en 8 cases (2 groupes de 4, maquette Rejoindre). */
export function InviteCodeInput({ value, onChange, error = false }: InviteCodeInputProps) {
    const { t } = useTranslation(['leagues']);

    return (
        <CodeInput
            accessibilityLabel={t('leagues:join.codeLabel')}
            autoCapitalize="characters"
            autoComplete="off"
            autoCorrect={false}
            error={error}
            groups={[4, 4]}
            length={8}
            onChange={onChange}
            sanitize={sanitizeInviteCodeInput}
            value={value}
        />
    );
}
