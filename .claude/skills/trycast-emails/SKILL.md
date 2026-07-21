---
name: trycast-emails
description: Modifier les e-mails transactionnels TryCast (templates d'auth Supabase/GoTrue) — générateur scripts/build-email-templates.mjs, contraintes du HTML d'e-mail (CSS inline, tables, polices), variables Go disponibles, mise en ligne sur le projet dev et le piège de supabase config push. À consulter dès qu'on touche à supabase/templates/, au texte d'un e-mail d'auth, ou au parcours de reset de mot de passe par code.
---

# E-mails transactionnels TryCast

Les 7 e-mails d'auth (GoTrue) : confirmation d'inscription, réinitialisation de mot de passe, changement d'adresse, invitation, réauthentification, + 2 notifications de sécurité (mot de passe modifié, adresse modifiée). Envoyés par **SMTP custom Resend** (domaine `trycast.fr` vérifié, région EU, 30 e-mails/h).

## Ne jamais éditer `supabase/templates/*.html` à la main

Ces fichiers sont **générés**. La source est `scripts/build-email-templates.mjs` :

```bash
npm run emails:build   # régénère les 7 fichiers
npm run emails:check   # échoue si un fichier a dérivé de sa source (garde-fou type app-version.test.ts)
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

## ⚠️ Mise en ligne : `supabase config push` est un piège

Les sujets FR et les `content_path` sont câblés dans `supabase/config.toml`, mais **`supabase config push` pousse toute la section `[auth]`**, pas seulement les templates — et la CLI **n'a pas de mode diff / dry-run**.

Or le `config.toml` du repo **n'est pas un miroir du dashboard** : il contient encore `rate_limit.email_sent = 2` (le vrai plafond est à **30**), un `site_url` en `127.0.0.1`, et le bloc SMTP commenté. **Le pousser tel quel casserait la config Resend.**

Avant tout `config push` : aligner d'abord l'intégralité du `[auth]` sur les valeurs réelles du dashboard. Sinon, coller les templates à la main dans Authentication → Emails.

## Reset de mot de passe : code OTP, pas de lien

Décision actée (2026-07-21) : le template `recovery` affiche `{{ .Token }}` et **aucun lien**. Le parcours vit entièrement dans l'app — `(auth)/forgot-password.tsx` envoie le code, `(auth)/reset-password.tsx` le saisit, `use-reset-password.ts` enchaîne `verifyOtp` puis `updateUser`. `resetPasswordForEmail` est appelé **sans `redirectTo`** : aucun token ne traîne dans une URL.

**Piège de l'ordre des appels** : `verifyOtp` **ouvre la session**, ce qui fait basculer `Stack.Protected` sur `(app)` et **démonte l'écran** dans la foulée. Une erreur renvoyée ensuite par `updateUser` n'aurait plus où s'afficher → le mot de passe doit être **validé côté client avant** d'appeler le hook (longueur, confirmation). Reste le cas `same_password`, bénin.

## Vérification

`EMAIL=une.vraie@adresse.fr bash scripts/e2e-email.sh` — ⚠️ envoie de **vrais** e-mails et crée des comptes de test (requête de nettoyage affichée en fin de run). Ne prouve que le transport : le rendu se juge à l'œil dans une vraie boîte.
