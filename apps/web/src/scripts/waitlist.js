// Formulaire waitlist : validation, honeypot, appel de la RPC Supabase join_waitlist.
// Fichier .js volontairement (pas .ts, pas de <script> inline dans le composant) : un module
// TS/.astro ne matche l'include d'aucun tsconfig et la découverte rolldown escalade alors
// jusqu'au tsconfig racine du repo (voir astro.config.mjs).

const section = document.querySelector('#waitlist');
const form = section?.querySelector('form');
const successCard = section?.querySelector('.success');

if (section && form && successCard) {
    const emailInput = form.querySelector('input[type="email"]');
    const trapInput = form.querySelector('input[name="website"]');
    const submitButton = form.querySelector('button[type="submit"]');
    const emailError = form.querySelector('.error-email');
    const networkError = form.querySelector('.error-network');

    const showSuccess = () => {
        form.hidden = true;
        successCard.hidden = false;
    };

    const clearErrors = () => {
        form.classList.remove('has-error');
        if (emailError) emailError.hidden = true;
        if (networkError) networkError.hidden = true;
    };

    emailInput?.addEventListener('input', clearErrors);

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        clearErrors();

        const email = emailInput?.value.trim() ?? '';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            form.classList.add('has-error');
            if (emailError) emailError.hidden = false;
            return;
        }

        // Honeypot rempli = bot : on simule le succès sans rien envoyer.
        if (trapInput?.value) {
            showSuccess();
            return;
        }

        const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
        const supabaseKey = import.meta.env.PUBLIC_SUPABASE_KEY;

        if (submitButton) submitButton.disabled = true;
        try {
            const response = await fetch(`${supabaseUrl}/rest/v1/rpc/join_waitlist`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    apikey: supabaseKey,
                    Authorization: `Bearer ${supabaseKey}`,
                },
                body: JSON.stringify({ email }),
            });
            if (!response.ok) throw new Error(`join_waitlist HTTP ${response.status}`);
            showSuccess();
        } catch {
            if (networkError) networkError.hidden = false;
        } finally {
            if (submitButton) submitButton.disabled = false;
        }
    });
}
