#!/usr/bin/env node
/**
 * Génère les templates d'e-mails d'auth Supabase dans `supabase/templates/`, et
 * dans `docs/emails/` l'e-mail de bienvenue (template Resend) et les e-mails de la
 * beta envoyés en broadcast Resend.
 *
 * Pourquoi un générateur plutôt que 7 fichiers écrits à la main : un e-mail HTML
 * ne peut pas inclure de partiel ni de feuille de style externe, donc l'habillage
 * (en-tête, bouton, pied de page) serait dupliqué 7 fois. Ici il vit une seule
 * fois, et seul le contenu change d'un template à l'autre.
 *
 *   node scripts/build-email-templates.mjs           écrit les fichiers
 *   node scripts/build-email-templates.mjs --check   échoue si un fichier a dérivé
 *   node scripts/build-email-templates.mjs --league-code ABCD2345
 *       écrit en plus docs/emails/beta-league.local.html, l'e-mail de la ligue des
 *       testeurs. Le dépôt est public et le code ouvre la ligue à qui le lit : ce
 *       fichier est ignoré par git, et rien n'est écrit sans le code.
 *   node scripts/build-email-templates.mjs --testflight https://testflight.apple.com/join/XXXXXXXX
 *       écrit en plus docs/emails/beta-invite.local.html, l'invitation à la beta. Même
 *       raison : le lien public TestFlight laisse entrer n'importe qui jusqu'au plafond.
 *   Les deux options se combinent.
 *
 * Les broadcasts ne passent pas par GoTrue : pas de variables Go. Seules les
 * variables Resend fonctionnent, en triple accolade ({{{RESEND_UNSUBSCRIBE_URL}}}).
 *
 * Contraintes du support e-mail (ne pas « moderniser » sans vérifier) :
 *  - styles INLINE uniquement pour tout ce qui compte ; le <style> du <head> est
 *    un bonus (Outlook Windows en ignore l'essentiel)
 *  - pas de variables CSS : les tokens du design system sont recopiés en hex
 *  - pas de flex ni de grid : mise en page en <table>
 *  - pas de @font-face fiable : Anton/Inter ne se chargent pas, d'où les piles
 *    de repli ; le titre tombe sur Arial Narrow gras
 *  - images en URL absolue https uniquement (servies par trycast.fr)
 *  - tout fond coloré en DOUBLE : attribut `bgcolor` (Outlook) ET `background-color`
 *    inline. Proton Mail supprime l'attribut : le bandeau et le bouton, qui n'avaient
 *    que lui, sortaient blanc sur blanc (vu le 2026-09-14 sur l'e-mail de la beta)
 *
 * Variables Go disponibles côté GoTrue : .ConfirmationURL, .Token, .TokenHash,
 * .SiteURL, .RedirectTo, .Data, .Email, .NewEmail (email_change uniquement),
 * .OldEmail (notification email_changed uniquement).
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const OUT_DIR = join(ROOT, 'supabase', 'templates');
const BROADCAST_DIR = join(ROOT, 'docs', 'emails');
const SITE = 'https://www.trycast.fr';

/**
 * Lien d'inscription au test fermé Play : le même pour tous les testeurs, il ne
 * dépend que du package. Le comparer à celui de la console (Tests fermés → Testeurs)
 * avant un envoi.
 */
const PLAY_TESTING_URL = 'https://play.google.com/apps/testing/com.cohozen.trycast';

/** Fiche App Store de TestFlight, l'app d'Apple qui installe les versions de test. */
const TESTFLIGHT_APP_URL = 'https://apps.apple.com/app/testflight/id899247664';

/** Lien public du groupe TestFlight externe (App Store Connect → TestFlight → groupe). */
const TESTFLIGHT_JOIN = /^https:\/\/testflight\.apple\.com\/join\/[A-Za-z0-9]+$/;

/** Alphabet des codes de ligue — miroir de normalizeInviteCode (apps/mobile/src/features/leagues/validation.ts). */
const LEAGUE_CODE = /^[A-HJ-KM-NP-Z2-9]{8}$/;

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
                                    <td align="center" bgcolor="${C.accent}" style="background-color:${C.accent};border-radius:999px;">
                                        <a href="${url}" style="display:inline-block;background-color:${C.accent};padding:15px 32px;font-family:${BODY};font-size:16px;font-weight:600;line-height:20px;color:${C.onAccent};text-decoration:none;border-radius:999px;">${label}</a>
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
                                    <td align="center" bgcolor="${C.page}" style="background-color:${C.page};padding:22px 16px;border:1px solid ${C.border};border-radius:14px;">
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

/** Intertitre dans le corps du message — même pile que le titre, en plus petit. */
const h2 = (text) =>
    `<h2 style="margin:32px 0 0;font-family:${DISPLAY};font-size:20px;font-weight:700;line-height:26px;letter-spacing:0.3px;color:${C.text};">${text}</h2>`;

/**
 * Étapes numérotées. Pas de <ol> : les puces et retraits varient trop d'un client à
 * l'autre, et Outlook décale les numéros. Le numéro reste neutre : le grenat est
 * réservé au bouton.
 */
const steps = (items) => `
                            <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%" style="margin:20px 0 0;">
${items
    .map(
        (html, i) => `                                <tr>
                                    <td valign="top" width="36" style="width:36px;padding:${i === 0 ? 0 : 14}px 0 0;">
                                        <div style="width:26px;height:26px;border-radius:13px;background-color:${C.page};border:1px solid ${C.border};font-family:${DISPLAY};font-size:15px;font-weight:700;line-height:26px;text-align:center;color:${C.text};">${i + 1}</div>
                                    </td>
                                    <td valign="top" style="padding:${i === 0 ? 3 : 17}px 0 0;font-family:${BODY};font-size:16px;line-height:24px;color:${C.muted};">${html}</td>
                                </tr>`,
    )
    .join('\n')}
                            </table>`;

/**
 * Deux boutons côte à côte, un par téléphone : même technique que cta(), fond encre
 * façon badge de store. Pas les badges officiels : celui de l'App Store ne peut pas
 * pointer vers TestFlight, et une image bloquée (Outlook, Proton) ferait disparaître
 * le bouton. Pas de grenat : aucune des deux plateformes ne passe avant l'autre.
 * Libellés courts : les deux cellules tiennent côte à côte sur 335 px.
 */
const storeButtons = (buttons) => `
                            <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%" style="margin:28px 0 0;">
                                <tr>
${buttons
    .map(
        (
            { label, via, url },
            i,
        ) => `                                    <td valign="top" width="50%" style="width:50%;padding:0 ${i === 0 ? 6 : 0}px 0 ${i === 0 ? 0 : 6}px;">
                                        <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%">
                                            <tr>
                                                <td align="center" bgcolor="${C.text}" style="background-color:${C.text};border-radius:14px;">
                                                    <a href="${url}" style="display:block;background-color:${C.text};padding:12px 8px;font-family:${BODY};text-decoration:none;border-radius:14px;">
                                                        <span style="display:block;font-size:16px;font-weight:600;line-height:22px;color:${C.onBrand};">${label}</span>
                                                        <span style="display:block;font-size:13px;line-height:18px;color:${C.faint};">${via}</span>
                                                    </a>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>`,
    )
    .join('\n')}
                                </tr>
                            </table>`;

const footerLink = (label, url) =>
    `<a href="${url}" style="color:${C.faint};text-decoration:underline;">${label}</a>`;

/** Pied des e-mails d'auth : partis sans que personne ne les attende, on ne lit pas les réponses. */
const AUTH_FOOTER = `E-mail automatique envoyé par TryCast - inutile d'y répondre.<br />
                                Une question ? ${footerLink('contact@trycast.fr', 'mailto:contact@trycast.fr')}`;

/**
 * Pied des broadcasts : l'inverse, les réponses sont attendues (elles arrivent sur
 * contact@, adresse d'expédition). Resend remplace le lien de désinscription à l'envoi.
 */
const BROADCAST_FOOTER = `Tu reçois cet e-mail parce que tu as demandé à tester TryCast.<br />
                                Une question ? Réponds simplement à ce message.<br />
                                ${footerLink('Ne plus recevoir ces e-mails', '{{{RESEND_UNSUBSCRIBE_URL}}}')}`;

export const render = ({ preheader, title, blocks, footer = AUTH_FOOTER }) => `<!doctype html>
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
                        <td bgcolor="${C.brand}" class="tc-pad" style="background-color:${C.brand};padding:20px 32px;">
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
                                ${footer}
                                · ${footerLink('Confidentialité', `${SITE}/confidentialite`)}
                                · ${footerLink('Mentions légales', `${SITE}/mentions-legales`)}
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

export const TEMPLATES = [
    {
        file: 'confirmation.html',
        key: 'confirmation',
        subject: 'Confirme ton adresse e-mail',
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
        key: 'recovery',
        subject: 'Ton code pour réinitialiser ton mot de passe',
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
        key: 'email_change',
        subject: 'Confirme ta nouvelle adresse e-mail',
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
        key: 'invite',
        subject: 'Tu es invité·e sur TryCast',
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
        key: 'reauthentication',
        subject: 'Ton code de vérification TryCast',
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
        key: 'password_changed_notification',
        subject: 'Ton mot de passe TryCast a été modifié',
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
        key: 'email_changed_notification',
        subject: "L'adresse e-mail de ton compte TryCast a changé",
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

/* ---- Les e-mails de la beta (broadcasts Resend, docs/emails/) ---- */

const strong = (text) => `<strong style="color:${C.text};">${text}</strong>`;

const link = (label, url) =>
    `<a href="${url}" style="color:${C.text};font-weight:600;text-decoration:underline;">${label}</a>`;

/** Commun aux deux e-mails : les testeurs écrivent par où ils veulent. */
const feedback = p(
    `Un bug, une idée, un écran pas clair ? Réponds simplement à cet e-mail, ou écris-moi directement si on se connaît. Tous les retours comptent, même pour dire que tout va bien.`,
    { top: 12 },
);

/**
 * Un seul e-mail pour toute l'Audience, iPhone et Android : chacun suit les étapes de
 * son téléphone. Le lien Play ne sert qu'aux comptes Google de la liste des testeurs ;
 * un iPhoniste qui l'ouvre ne casse rien.
 */
export const betaInvite = (testflightUrl) => ({
    file: 'beta-invite.local.html',
    subject: 'La beta TryCast est ouverte',
    preheader:
        'Installe TryCast sur iPhone ou Android et commence à pronostiquer avant tout le monde.',
    title: 'La beta est ouverte',
    footer: BROADCAST_FOOTER,
    blocks: [
        p(
            "Merci de vouloir tester TryCast, l'app de pronostics rugby entre potes. La beta fermée démarre, et ta place est prête.",
        ),
        storeButtons([
            { label: '🍏 Sur iPhone', via: 'TestFlight', url: testflightUrl },
            { label: '🤖 Sur Android', via: 'Google Play', url: PLAY_TESTING_URL },
        ]),
        p('Les étapes pour ton téléphone sont juste en dessous.', {
            size: 14,
            color: C.faint,
            top: 14,
        }),
        h2('Sur iPhone'),
        steps([
            `Installe ${link('TestFlight', TESTFLIGHT_APP_URL)} depuis l'App Store : c'est l'app gratuite d'Apple pour les versions de test.`,
            `Depuis ton iPhone, appuie sur ${strong('Sur iPhone')} plus haut, puis sur ${strong('Accepter')} et ${strong('Installer')}.`,
            'Ouvre TryCast et crée ton compte (avec Apple, Google ou par e-mail). Les mises à jour arrivent par TestFlight.',
        ]),
        fallbackLink(testflightUrl),
        h2('Sur Android'),
        steps([
            `Depuis ton téléphone Android, connecté au compte Google inscrit à la beta, appuie sur ${strong('Sur Android')} plus haut.`,
            `Appuie sur ${strong('Devenir testeur')}.`,
            'Installe TryCast depuis le Play Store, puis crée ton compte (avec Google ou par e-mail).',
        ]),
        fallbackLink(PLAY_TESTING_URL),
        callout(
            `Un service à te demander : garde l'app installée ${strong('au moins 14 jours')}. C'est la condition posée par Google avant de laisser TryCast sortir sur le Play Store. Pas besoin d'y passer tous les jours.`,
        ),
        h2('Un retour ?'),
        feedback,
        p(`Dans l'app, tu peux aussi passer par ${strong('Réglages → Signaler un problème')}.`, {
            top: 12,
        }),
        callout(
            'Tu peux quitter la beta à tout moment : depuis le lien Play sur Android, depuis TestFlight sur iPhone.',
        ),
    ],
});

export const betaLeague = (code) => ({
    file: 'beta-league.local.html',
    subject: 'La ligue des testeurs t’attend',
    preheader: 'Rejoins la ligue des testeurs de la beta et affronte les autres pronostiqueurs.',
    title: 'La ligue des testeurs',
    footer: BROADCAST_FOOTER,
    blocks: [
        p(
            "Maintenant que TryCast est installé, place au jeu : j'ai créé une ligue réservée aux testeurs de la beta. Pronostique les prochains matchs et vois où tu te situes face aux autres.",
        ),
        cta('Rejoindre la ligue', `${SITE}/rejoindre/${code}`),
        p(
            `Le bouton ouvre directement l'app. Tu préfères saisir le code ? Dans l'onglet ${strong('Matchs')}, appuie sur ${strong('Rejoindre une ligue')} :`,
            { top: 28 },
        ),
        codeBlock(code),
        callout(
            "Le bouton n'ouvre pas l'app ? Elle n'est sans doute pas encore installée : suis d'abord les étapes de l'e-mail d'invitation à la beta.",
        ),
        h2('Un retour ?'),
        feedback,
    ],
});

/* ---- Bienvenue des comptes Google et Apple (template Resend, docs/emails/) ---- */

/**
 * Envoyé par le trigger profiles_welcome_email (migration 20260926000400) quand un
 * compte créé par un fournisseur choisit son pseudo : un compte e-mail a déjà reçu
 * l'e-mail de confirmation. Mis en ligne comme template Resend publié sous l'alias
 * « welcome », avec la variable USERNAME (triple accolade, remplacée par Resend).
 * Français seul pour la beta.
 */
export const WELCOME = {
    file: 'welcome.html',
    subject: 'Bienvenue sur TryCast',
    preheader: 'Ton compte est prêt : place aux pronos.',
    title: 'Bienvenue, {{{USERNAME}}}',
    blocks: [
        p("Ton compte TryCast est prêt. Voici l'essentiel pour bien démarrer."),
        steps([
            `Dans l'onglet ${strong('Matchs')}, pronostique le score exact de chaque match avant le coup d'envoi.`,
            `Crée une ${strong('ligue')} et invite tes potes avec son lien, ou rejoins la leur avec leur code.`,
            `Garde ton ${strong('joker')} pour le match qui compte : il double tes points, une fois par phase.`,
        ]),
        callout('Plus ton prono est précis, plus tu marques. Bon match !'),
    ],
};

/* ---- Écriture / vérification ---- */

/** Les sujets vivent ici ; config.toml en garde une copie pour `supabase start`. */
function checkConfigTomlSubjects() {
    const toml = readFileSync(join(ROOT, 'supabase', 'config.toml'), 'utf8');
    const missing = TEMPLATES.filter(({ subject }) => !toml.includes(`subject = "${subject}"`));
    for (const { key } of missing) {
        console.error(`✗ config.toml : sujet désynchronisé pour ${key}`);
    }
    return missing.length;
}

/** Valeur qui suit l'option `name` en ligne de commande ; null si l'option est absente. */
function argValue(name) {
    const i = process.argv.indexOf(name);
    return i === -1 ? null : (process.argv[i + 1] ?? '');
}

/** Valeur de --league-code, validée ; null si l'option est absente. */
function leagueCodeArg() {
    const raw = argValue('--league-code');
    if (raw === null) return null;
    const code = raw.toUpperCase().replaceAll(/[\s-]/g, '');
    if (!LEAGUE_CODE.test(code)) {
        console.error(`✗ --league-code : « ${raw} » n'est pas un code de ligue`);
        console.error('  8 caractères, sans 0, O, 1, I ni L (cf. normalizeInviteCode)');
        process.exit(1);
    }
    return code;
}

/** Valeur de --testflight, validée ; null si l'option est absente. */
function testflightArg() {
    const url = argValue('--testflight');
    if (url === null) return null;
    if (!TESTFLIGHT_JOIN.test(url)) {
        console.error(`✗ --testflight : « ${url} » n'est pas un lien public TestFlight`);
        console.error('  attendu : https://testflight.apple.com/join/<code>');
        process.exit(1);
    }
    return url;
}

function main() {
    const check = process.argv.includes('--check');
    const leagueCode = leagueCodeArg();
    const testflightUrl = testflightArg();
    mkdirSync(OUT_DIR, { recursive: true });
    mkdirSync(BROADCAST_DIR, { recursive: true });

    const outputs = [
        ...TEMPLATES.map((template) => ({ template, dir: OUT_DIR, label: 'supabase/templates' })),
        { template: WELCOME, dir: BROADCAST_DIR, label: 'docs/emails' },
    ];

    let drifted = 0;
    for (const { template, dir, label } of outputs) {
        const html = render(template);
        const path = join(dir, template.file);
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
        console.log(`✓ ${label}/${template.file}`);
    }

    if (check) {
        drifted += checkConfigTomlSubjects();
        if (drifted > 0) {
            console.error(`\n${drifted} écart(s) : npm run emails:build, puis recaler config.toml`);
            process.exit(1);
        }
        console.log(`✓ ${outputs.length} templates à jour, sujets config.toml en phase`);
        return;
    }

    // Générés à la demande seulement, et jamais vérifiés : ils n'existent pas dans le dépôt.
    if (testflightUrl) {
        const template = betaInvite(testflightUrl);
        writeFileSync(join(BROADCAST_DIR, template.file), render(template), 'utf8');
        console.log(`✓ docs/emails/${template.file} (ignoré par git)`);
    }
    if (leagueCode) {
        const template = betaLeague(leagueCode);
        writeFileSync(join(BROADCAST_DIR, template.file), render(template), 'utf8');
        console.log(`✓ docs/emails/${template.file} (ligue ${leagueCode}, ignoré par git)`);
    }
}

// Exécuté en CLI uniquement : scripts/push-email-config.mjs importe ce module.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    main();
}
