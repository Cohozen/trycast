import { useTranslation } from 'react-i18next';

import { GoogleMark } from '@/components/marks/google-mark';
import { Button } from '@/components/ui/button';
import type { OAuthProvider, OAuthProviderId } from '@/features/auth/providers';

/**
 * Marque de chaque fournisseur. Un `apple-mark.tsx` s'ajoutera ici le jour où
 * l'entrée `apple` rejoindra `providers.ts` — c'est le seul endroit de l'UI qui
 * connaît les fournisseurs par leur nom.
 */
const MARKS: Record<OAuthProviderId, React.ReactNode> = {
    google: <GoogleMark />,
    apple: null,
};

type OAuthButtonProps = {
    provider: OAuthProvider;
    onPress: (provider: OAuthProvider) => void;
    loading?: boolean;
    disabled?: boolean;
};

/**
 * Bouton « Continuer avec … », générique par construction : il ne sait rien du
 * fournisseur au-delà de ce que `providers.ts` en déclare.
 *
 * Variante `secondary` (fond neutre, bordure) : le grenat de l'accent est
 * réservé au CTA principal de l'écran, et les règles d'usage des marques
 * tierces demandent un fond neutre.
 */
export function OAuthButton({ provider, onPress, loading, disabled }: OAuthButtonProps) {
    const { t } = useTranslation(['auth']);

    return (
        <Button
            disabled={disabled}
            fullWidth
            leadingIcon={MARKS[provider.id]}
            loading={loading}
            onPress={() => onPress(provider)}
            size="lg"
            title={t(provider.labelKey)}
            variant="secondary"
        />
    );
}
