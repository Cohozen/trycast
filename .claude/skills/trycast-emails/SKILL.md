---
name: trycast-emails
description: Modifier les e-mails transactionnels TryCast (templates d'auth Supabase/GoTrue) — générateur scripts/build-email-templates.mjs, contraintes du HTML d'e-mail (CSS inline, tables, polices), variables Go disponibles, mise en ligne sur le projet dev et le piège de supabase config push. À consulter dès qu'on touche à supabase/templates/, au texte d'un e-mail d'auth, ou au parcours de reset de mot de passe par code.
---

# E-mails transactionnels TryCast

Les 7 e-mails d'auth (GoTrue) : confirmation d'inscription, réinitialisation de mot de passe, changement d'adresse, invitation, réauthentification, + 2 notifications de sécurité (mot de passe modifié, adresse modifiée). Envoyés par **SMTP custom Resend** (domaine `trycast.fr` vérifié, région EU, 30 e-mails/h).

## Ne jamais éditer `supabase/templates/*.html` à la main

Ces fichiers sont **générés**. La source est `scripts/build-email-templates.mjs`, qui porte aussi **les sujets et les clés GoTrue** de chaque template :

```bash
npm run emails:build   # régénère les 7 fichiers
npm run emails:check   # échoue si un fichier a dérivé, ou si les sujets de config.toml ne correspondent plus
```

Pourquoi un générateur : un e-mail HTML ne peut ni inclure un partiel ni charger une feuille de style externe, donc l'habillage commun (bandeau vert, bouton, encadré, pied de page) serait dupliqué 7 fois. Il vit une seule fois dans le script ; seul le contenu change d'un template à l'autre.

## Contraintes du HTML d'e-mail (ne pas « moderniser »)

Le rendu se fait dans Gmail / Outlook / Apple Mail, pas dans un navigateur.

- **Styles inline obligatoires** pour tout ce qui compte. Le `<style>` du `<head>` est un bonus (media queries) : Outlook Windows, qui rend via le moteur de Word, en ignore l'essentiel.
- **Pas de variables CSS.** `var(--accent)` ne marche nulle part → les tokens du DS sont **recopiés en hex** en haut du script (objet `C`). Si une couleur du DS bouge, la reporter là aussi.
- **Pas de flex ni de grid** : mise en page en `<table>` imbriquées, largeur 600px.
- **`@font-face` non fiable** : **Anton et Inter ne se chargent pas** chez la majorité. Les piles de repli comptent plus que le premier nom — les titres tombent en pratique sur `Arial Narrow` gras.
- **`border-radius` ignoré par Outlook Windows** : boutons à angles droits chez lui, accepté (pas de hack VML).
- **Images en URL absolue https uniquement**, servies par `trycast.fr`. Aucun SVG (aucun client mail ne le rend).
- **Dark mode volontairement non traité** : `<meta name="color-scheme" content="light">` est déclaré pour limiter l'inversion d'Apple Mail, mais Gmail inverse tout seul et de façon imprévisible. Une palette claire robuste vaut mieux qu'une bataille perdue d'avance.
- Règle DS conservée : **le grenat est l'étincelle**, réservé au bouton d'action. L'URL de repli sous le bouton reste en gris, sinon deux lignes d'URL grenat volent la vedette au CTA.

## Le logo

`web/public/email-logo.png` = **le ballon seul**, sur fond vert marque cuit dans l'image (pas d'alpha à gérer), géométrie strictement identique au favicon. Le wordmark « TryCast » est du **texte HTML** à côté : il reste lisible quand les images sont bloquées, ce qui est le cas par défaut chez beaucoup de clients.

Pourquoi pas un lockup complet en image : la machine n'a **ni rasteriseur SVG avec support des polices custom, ni Chrome headless, ni fontkit** — Anton ne peut pas être cuit proprement dans un PNG. Régénération : voir le script dans le scratchpad de la session du 2026-07-21 (sharp est fourni par `web/node_modules`, entrée `dist/index.mjs` et non `lib/index.js`).

## Variables Go disponibles (GoTrue)

`.ConfirmationURL`, `.Token` (OTP 6 chiffres), `.TokenHash`, `.SiteURL`, `.RedirectTo`, `.Data` (user_metadata), `.Email`, `.NewEmail` (**template `email_change` uniquement**), `.OldEmail` (**notification `email_changed` uniquement**).

⚠️ Ne pas personnaliser avec `.Data.username` : une clé absente rend `<no value>` en Go, pas une chaîne vide.

## Prévisualiser

Les templates contiennent des `{{ .Variables }}` non rendues. Recette : copier les fichiers dans un dossier temporaire en substituant des valeurs d'exemple et en pointant le logo sur une copie locale, servir avec `python3 -m http.server`, puis ouvrir dans le panneau navigateur.

## Mise en ligne : `npm run emails:push`, jamais `supabase config push`

```bash
export SUPABASE_ACCESS_TOKEN='sbp_...'   # https://supabase.com/dashboard/account/tokens
npm run emails:push -- --dry-run          # diff champ par champ, n'écrit rien
npm run emails:push
```

`scripts/push-email-config.mjs` PATCHe l'API Management avec les seuls champs e-mail (sujets, contenus, `mailer_otp_length`, activation des 2 notifications) et **relit la config après écriture** au lieu de se fier au code retour.

**⚠️ Ne pas utiliser `supabase config push`**, pour deux raisons distinctes :

1. Il pousse **toute** la configuration du projet, sans dry-run. Le `config.toml` a été aligné sur le live le 2026-07-21, mais toute dérive future (le bloc `[auth.email.smtp]` recommenté, `rate_limit.email_sent` revenu à 2) **débranche Resend** au passage. Les valeurs par défaut de `supabase init` sont des pièges : elles désactivaient aussi le TOTP.
2. Il **échoue de toute façon** sur ce projet : `failed to read Storage config: SchemaError(Missing key at ["databasePoolMode"])` — la CLI lit toute la config distante avant de pousser et bute sur un décalage de schéma avec la plateforme (constaté en 2.106.0). L'échec est en lecture, donc rien n'est écrit.

Le `[auth]` du `config.toml` reste la référence versionnée (et sert à `supabase start`), mais ce n'est plus le mécanisme de déploiement.

### Comparer le repo au live

```bash
curl -s -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  https://api.supabase.com/v1/projects/bmdzadvugtkclnqjpndr/config/auth > ~/auth-live.json
```

⚠️ La réponse contient **`smtp_pass`** : fichier local uniquement, à supprimer après usage, jamais dans le repo. Correspondances utiles : `uri_allow_list` ↔ `additional_redirect_urls`, `mailer_autoconfirm` ↔ l'inverse d'`enable_confirmations`, `smtp_max_frequency` (secondes) ↔ `email.max_frequency`, `rate_limit_verify` ↔ `sign_in_sign_ups`, `rate_limit_otp` ↔ `token_verifications`.

## Reset de mot de passe : code OTP, pas de lien

Décision actée (2026-07-21) : le template `recovery` affiche `{{ .Token }}` et **aucun lien**. Le parcours vit entièrement dans l'app — `(auth)/forgot-password.tsx` envoie le code, `(auth)/reset-password.tsx` le saisit, `use-reset-password.ts` enchaîne `verifyOtp` puis `updateUser`. `resetPasswordForEmail` est appelé **sans `redirectTo`** : aucun token ne traîne dans une URL.

**Piège de l'ordre des appels** : `verifyOtp` **ouvre la session**, ce qui fait basculer `Stack.Protected` sur `(app)` et **démonte l'écran** dans la foulée. Une erreur renvoyée ensuite par `updateUser` n'aurait plus où s'afficher → le mot de passe doit être **validé côté client avant** d'appeler le hook (longueur, confirmation). Reste le cas `same_password`, bénin.

**Renvoi du code** : GoTrue refuse deux e-mails de recovery rapprochés pour un même compte (`smtp_max_frequency`, **60 s** en ligne) et répond 429 `over_email_send_rate_limit`. L'app tient le même délai (`RESEND_COOLDOWN_MS` dans `src/features/auth/reset-code.ts`) pour ne pas proposer une action vouée à échouer — **les deux valeurs doivent rester d'accord**. Un renvoi **invalide le code précédent** côté serveur : l'écran vide la saisie et le dit.

**`mailer_otp_length` doit rester à 6** : le projet dev était à 8 (défaut hérité), ce qui rendait le parcours impossible — l'app valide un code à 6 chiffres (`RESET_CODE_LENGTH`, miroir de ce réglage).

**Toutes les erreurs de code se ressemblent** : code faux, expiré, déjà consommé **et e-mail inconnu** renvoient tous `403 / otp_expired / "Token has expired or is invalid"`. Un seul message i18n est donc possible (`auth:errors.otpExpired`), et il ne doit pas laisser croire que le compte n'existe pas.

## Vérification

`EMAIL=une.vraie@adresse.fr bash scripts/e2e-email.sh` — ⚠️ envoie de **vrais** e-mails et crée des comptes de test (requête de nettoyage affichée en fin de run). Ne prouve que le transport : le rendu se juge à l'œil dans une vraie boîte.

Parcours de reset complet : `scripts/e2e-password-reset.sh`, en **deux passes** (envoi, puis assertions avec `CODE=…`). Le code **n'est pas récupérable en base** — GoTrue ne stocke que son empreinte (`GenerateTokenHash(email, otp)`) — il faut donc le relever dans l'e-mail, aucun contournement SQL n'existe. L'assertion qui compte est la connexion avec l'**ancien** mot de passe : elle doit échouer, sinon le reset n'a pas pris. Validé 7/7 le 2026-07-22.
