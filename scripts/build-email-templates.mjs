#!/usr/bin/env node
/**
 * Génère les templates d'e-mails d'auth Supabase dans `supabase/templates/`.
 *
 * Pourquoi un générateur plutôt que 7 fichiers écrits à la main : un e-mail HTML
 * ne peut pas inclure de partiel ni de feuille de style externe, donc l'habillage
 * (en-tête, bouton, pied de page) serait dupliqué 7 fois. Ici il vit une seule
 * fois, et seul le contenu change d'un template à l'autre.
 *
 *   node scripts/build-email-templates.mjs           écrit les fichiers
 *   node scripts/build-email-templates.mjs --check   échoue si un fichier a dérivé
 *
 * Contraintes du support e-mail (ne pas « moderniser » sans vérifier) :
 *  - styles INLINE uniquement pour tout ce qui compte ; le <style> du <head> est
 *    un bonus (Outlook Windows en ignore l'essentiel)
 *  - pas de variables CSS : les tokens du design system sont recopiés en hex
 *  - pas de flex ni de grid : mise en page en <table>
 *  - pas de @font-face fiable : Anton/Inter ne se chargent pas, d'où les piles
 *    de repli ; le titre tombe sur Arial Narrow gras
 *  - images en URL absolue https uniquement (servies par trycast.fr)
 *
 * Variables Go disponibles côté GoTrue : .ConfirmationURL, .Token, .TokenHash,
 * .SiteURL, .RedirectTo, .Data, .Email, .NewEmail (email_change uniquement),
 * .OldEmail (notification email_changed uniquement).
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(ROOT, 'supabase', 'templates');
const SITE = 'https://www.trycast.fr';

/* ---- Tokens du design system, recopiés en hex (aucun var() en e-mail) ---- */
const C = {
    page: '#f3f0ea', // surface-sunken light
    card: '#ffffff', // surface
    border: '#e8e3d9', // border
    brand: '#14432a', // green-800 — bandeau de marque
    onBrand: '#faf8f4', // sand-050
    text: '#16130e', // ink-900
    muted: '#5f584b', // ink-600
    faint: '#928a7b', // ink-400
    accent: '#e63e63', // grenat-500 — l'étincelle, réservée au CTA
    onAccent: '#ffffff',
};

const DISPLAY = "Anton, 'Arial Narrow', Arial, Helvetica, sans-serif";
const BODY =
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, Roboto, Helvetica, Arial, sans-serif";

/* ---- Briques de contenu ---- */

const p = (html, { size = 16, color = C.muted, top = 0 } = {}) =>
    `<p style="margin:${top}px 0 0;font-family:${BODY};font-size:${size}px;line-height:${Math.round(size * 1.5)}px;color:${color};">${html}</p>`;

const cta = (label, url) => `
                            <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="margin:28px 0 0;">
                                <tr>
                                    <td align="center" bgcolor="${C.accent}" style="border-radius:999px;">
                                        <a href="${url}" style="display:inline-block;padding:15px 32px;font-family:${BODY};font-size:16px;font-weight:600;line-height:20px;color:${C.onAccent};text-decoration:none;border-radius:999px;">${label}</a>
                                    </td>
                                </tr>
                            </table>`;

/**
 * Repli quand le bouton n'est pas cliquable (client texte, image bloquée…).
 * L'URL reste en gris : le grenat est l'étincelle du CTA, une URL de deux lignes
 * dans cette couleur lui volerait la vedette.
 */
const fallbackLink = (url) => `
                            <p style="margin:24px 0 0;font-family:${BODY};font-size:13px;line-height:20px;color:${C.faint};">
                                Le bouton ne fonctionne pas ? Copie ce lien dans ton navigateur :<br />
                                <a href="${url}" style="color:${C.muted};text-decoration:underline;word-break:break-all;">${url}</a>
                            </p>`;

/** Bloc du code à 6 chiffres — en Anton/Arial Narrow, très espacé pour la recopie. */
const codeBlock = (token) => `
                            <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%" style="margin:28px 0 0;">
                                <tr>
                                    <td align="center" bgcolor="${C.page}" style="padding:22px 16px;border:1px solid ${C.border};border-radius:14px;">
                                        <div style="font-family:${DISPLAY};font-size:38px;font-weight:700;line-height:44px;letter-spacing:10px;color:${C.text};">${token}</div>
                                    </td>
                                </tr>
                            </table>`;

/** Encadré discret : mise en garde sécurité, mention d'expiration. */
const callout = (html) => `
                            <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%" style="margin:28px 0 0;">
                                <tr>
                                    <td style="padding:16px 18px;background-color:${C.page};border-radius:14px;">
                                        <p style="margin:0;font-family:${BODY};font-size:14px;line-height:21px;color:${C.muted};">${html}</p>
                                    </td>
                                </tr>
                            </table>`;

const render = ({ preheader, title, blocks }) => `<!doctype html>
<html lang="fr" xmlns="http://www.w3.org/1999/xhtml">
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="x-apple-disable-message-reformatting" />
    <!-- On n'assume qu'un rendu clair : évite l'inversion automatique d'Apple Mail. -->
    <meta name="color-scheme" content="light" />
    <meta name="supported-color-schemes" content="light" />
    <title>${title}</title>
    <style>
        /* Bonus progressif : ignoré par une partie des clients, jamais indispensable. */
        @media only screen and (max-width: 620px) {
            .tc-card { width: 100% !important; border-radius: 0 !important; }
            .tc-pad { padding-left: 20px !important; padding-right: 20px !important; }
        }
    </style>
</head>
<body style="margin:0;padding:0;background-color:${C.page};">
    <!-- Texte d'aperçu affiché dans la liste des messages, puis masqué. -->
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${preheader}</div>
    <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%" style="background-color:${C.page};">
        <tr>
            <td align="center" style="padding:32px 12px;">
                <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="600" class="tc-card" style="width:600px;max-width:600px;background-color:${C.card};border:1px solid ${C.border};border-radius:16px;overflow:hidden;">
                    <tr>
                        <td bgcolor="${C.brand}" class="tc-pad" style="padding:20px 32px;">
                            <table border="0" cellpadding="0" cellspacing="0" role="presentation">
                                <tr>
                                    <td style="padding-right:12px;line-height:0;">
                                        <img src="${SITE}/email-logo.png" width="44" height="44" alt="" style="display:block;width:44px;height:44px;border:0;" />
                                    </td>
                                    <td style="font-family:${DISPLAY};font-size:26px;font-weight:700;line-height:30px;letter-spacing:0.5px;color:${C.onBrand};">TryCast</td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td class="tc-pad" style="padding:36px 32px 32px;">
                            <h1 style="margin:0 0 14px;font-family:${DISPLAY};font-size:28px;font-weight:700;line-height:34px;letter-spacing:0.3px;color:${C.text};">${title}</h1>
${blocks.join('\n')}
                        </td>
                    </tr>
                </table>
                <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="600" class="tc-card" style="width:600px;max-width:600px;">
                    <tr>
                        <td class="tc-pad" style="padding:20px 32px 0;">
                            <p style="margin:0;font-family:${BODY};font-size:12px;line-height:19px;color:${C.faint};">
                                E-mail automatique envoyé par TryCast — inutile d'y répondre.<br />
                                Une question ? <a href="mailto:contact@trycast.fr" style="color:${C.faint};text-decoration:underline;">contact@trycast.fr</a>
                                · <a href="${SITE}/confidentialite" style="color:${C.faint};text-decoration:underline;">Confidentialité</a>
                                · <a href="${SITE}/mentions-legales" style="color:${C.faint};text-decoration:underline;">Mentions légales</a>
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
`;

/* ---- Les 7 e-mails ---- */

const TEMPLATES = [
    {
        file: 'confirmation.html',
        preheader: 'Confirme ton adresse pour activer ton compte TryCast.',
        title: 'Bienvenue dans TryCast',
        blocks: [
            p(
                "Plus qu'une étape : confirme ton adresse e-mail pour activer ton compte et commencer à pronostiquer avec tes potes.",
            ),
            cta('Confirmer mon adresse', '{{ .ConfirmationURL }}'),
            fallbackLink('{{ .ConfirmationURL }}'),
            callout(
                "Ce lien est valable 1 heure. Si tu n'as pas créé de compte TryCast, ignore cet e-mail : aucun compte ne sera activé.",
            ),
        ],
    },
    {
        file: 'recovery.html',
        preheader: 'Ton code pour choisir un nouveau mot de passe.',
        title: 'Nouveau mot de passe',
        blocks: [
            p(
                "Tu as demandé à réinitialiser ton mot de passe. Saisis ce code dans l'app TryCast pour en choisir un nouveau :",
            ),
            codeBlock('{{ .Token }}'),
            callout(
                "Ce code est valable 1 heure. Si tu n'es pas à l'origine de cette demande, ignore cet e-mail : ton mot de passe reste inchangé.",
            ),
        ],
    },
    {
        file: 'email-change.html',
        preheader: 'Confirme le changement d’adresse e-mail de ton compte.',
        title: 'Confirme ta nouvelle adresse',
        blocks: [
            p(
                'Tu as demandé à remplacer <strong style="color:' +
                    C.text +
                    ';">{{ .Email }}</strong> par <strong style="color:' +
                    C.text +
                    ';">{{ .NewEmail }}</strong> sur ton compte TryCast.',
            ),
            p(
                "Par sécurité, les deux adresses doivent confirmer : tu recevras donc ce message sur chacune d'elles.",
                { top: 14 },
            ),
            cta('Confirmer le changement', '{{ .ConfirmationURL }}'),
            fallbackLink('{{ .ConfirmationURL }}'),
            callout(
                "Ce lien est valable 1 heure. Si tu n'as pas demandé ce changement, ignore cet e-mail et change ton mot de passe : ton adresse restera inchangée tant que les deux confirmations ne sont pas faites.",
            ),
        ],
    },
    // Pas de magic_link ici : le parcours n'existe pas dans l'app (décision Corentin).
    // S'il est activé un jour, ajouter le template avant, sinon le défaut anglais partira.
    {
        file: 'invite.html',
        preheader: 'Tu es invité·e à rejoindre TryCast.',
        title: 'Tu es invité·e sur TryCast',
        blocks: [
            p(
                'Quelqu’un t’invite à rejoindre TryCast, l’app de pronostics rugby entre potes. Accepte l’invitation pour créer ton compte.',
            ),
            cta('Rejoindre TryCast', '{{ .ConfirmationURL }}'),
            fallbackLink('{{ .ConfirmationURL }}'),
            callout("Si cette invitation ne t'était pas destinée, ignore simplement cet e-mail."),
        ],
    },
    {
        file: 'reauthentication.html',
        preheader: 'Ton code de vérification TryCast.',
        title: 'Code de vérification',
        blocks: [
            p("Pour confirmer que c'est bien toi, saisis ce code dans l'app TryCast :"),
            codeBlock('{{ .Token }}'),
            callout(
                "Ce code est valable 1 heure. Si tu n'as rien demandé, ignore cet e-mail et change ton mot de passe par précaution.",
            ),
        ],
    },
    {
        file: 'password-changed-notification.html',
        preheader: 'Le mot de passe de ton compte TryCast vient d’être modifié.',
        title: 'Ton mot de passe a changé',
        blocks: [
            p(
                'Le mot de passe du compte <strong style="color:' +
                    C.text +
                    ';">{{ .Email }}</strong> vient d’être modifié.',
            ),
            p("Si c'est bien toi, tu n'as rien à faire.", { top: 14 }),
            callout(
                "Si tu n'es pas à l'origine de ce changement, quelqu'un a peut-être accès à ton compte : réinitialise ton mot de passe depuis l'écran de connexion et écris-nous à <a href=\"mailto:contact@trycast.fr\" style=\"color:" +
                    C.accent +
                    ';text-decoration:underline;">contact@trycast.fr</a>.',
            ),
        ],
    },
    {
        file: 'email-changed-notification.html',
        preheader: 'L’adresse e-mail de ton compte TryCast vient de changer.',
        title: 'Ton adresse e-mail a changé',
        blocks: [
            p(
                'L’adresse e-mail de ton compte TryCast est passée de <strong style="color:' +
                    C.text +
                    ';">{{ .OldEmail }}</strong> à <strong style="color:' +
                    C.text +
                    ';">{{ .Email }}</strong>.',
            ),
            p(
                "Si c'est bien toi, tu n'as rien à faire : connecte-toi désormais avec la nouvelle adresse.",
                { top: 14 },
            ),
            callout(
                'Si tu n\'es pas à l\'origine de ce changement, écris-nous vite à <a href="mailto:contact@trycast.fr" style="color:' +
                    C.accent +
                    ';text-decoration:underline;">contact@trycast.fr</a>.',
            ),
        ],
    },
];

/* ---- Écriture / vérification ---- */

const check = process.argv.includes('--check');
mkdirSync(OUT_DIR, { recursive: true });

let drifted = 0;
for (const template of TEMPLATES) {
    const html = render(template);
    const path = join(OUT_DIR, template.file);
    if (check) {
        let current = null;
        try {
            current = readFileSync(path, 'utf8');
        } catch {
            /* fichier absent : traité comme une dérive */
        }
        if (current !== html) {
            console.error(`✗ ${template.file} a dérivé de scripts/build-email-templates.mjs`);
            drifted += 1;
        }
        continue;
    }
    writeFileSync(path, html, 'utf8');
    console.log(`✓ supabase/templates/${template.file}`);
}

if (check) {
    if (drifted > 0) {
        console.error(`\n${drifted} template(s) à régénérer : npm run emails:build`);
        process.exit(1);
    }
    console.log(`✓ ${TEMPLATES.length} templates à jour`);
}
