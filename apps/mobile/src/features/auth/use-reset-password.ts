import { useMutation } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

type ResetPasswordInput = {
    /** Adresse à laquelle le code a été envoyé — GoTrue vérifie le couple e-mail + code. */
    email: string;
    code: string;
    password: string;
};

/**
 * Réinitialisation du mot de passe par code reçu par e-mail (template
 * `recovery`, qui affiche `{{ .Token }}` et non un lien).
 *
 * Deux appels enchaînés, et l'ordre compte : `verifyOtp` consomme le code et
 * **ouvre une session**, ce qui fait aussitôt basculer `Stack.Protected` sur
 * `(app)` et démonte l'écran appelant. Le mot de passe doit donc être validé
 * côté client AVANT d'appeler ce hook (longueur, confirmation) : sinon un
 * `weak_password` renvoyé par `updateUser` arriverait sur un écran disparu et
 * l'utilisateur se retrouverait connecté avec son ancien mot de passe sans
 * message. Reste le cas `same_password` (nouveau == ancien) : bénin, la
 * personne est connectée avec le mot de passe qu'elle vient de saisir.
 */
export function useResetPassword() {
    return useMutation({
        mutationFn: async ({ email, code, password }: ResetPasswordInput) => {
            const { error: verifyError } = await supabase.auth.verifyOtp({
                email: email.trim(),
                token: code.trim(),
                type: 'recovery',
            });
            if (verifyError) throw verifyError;

            const { error: updateError } = await supabase.auth.updateUser({ password });
            if (updateError) throw updateError;
        },
    });
}
