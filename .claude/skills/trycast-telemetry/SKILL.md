---
name: trycast-telemetry
description: Mesure d'usage (Aptabase, région EU) et rapports de plantage (Sentry, région EU) de TryCast — catalogue d'événements typé, garde-fou par préférence locale et non par la table consents, ajout d'un événement, pièges de build sentry-cli, vues Debug/Release du tableau de bord Aptabase, obligations RGPD associées. À consulter dès qu'on ajoute ou modifie un événement de mesure, qu'on touche à apps/mobile/src/lib/analytics*.ts ou diagnostics.ts, aux interrupteurs de Réglages → Confidentialité, ou qu'un build échoue en erreur 65.
---

# Télémétrie TryCast — Aptabase & Sentry

Deux outils, tous deux en **région européenne**, tous deux **actifs par défaut et
désactivables** (opt-out) dans Réglages → Confidentialité, tous deux **inertes sans leur
clé** — la CI et un clone frais du dépôt tournent sans configuration.

| | Aptabase | Sentry |
|---|---|---|
| Sert à | Quelles fonctionnalités sont utilisées | Quand et pourquoi l'app plante |
| Région | UE — encodée dans la clé `A-EU-…` | UE — hôte `…ingest.de.sentry.io` |
| Variable | `EXPO_PUBLIC_APTABASE_KEY` | `EXPO_PUBLIC_SENTRY_DSN` |
| Enveloppe | `apps/mobile/src/lib/analytics.ts` | `apps/mobile/src/lib/diagnostics.ts` |
| Module natif | **Non** (0 dépendance de prod) | **Oui** ⇒ rebuild du dev client |

⚠️ **La résidence des données Sentry se choisit à la création de l'organisation et n'est
pas modifiable ensuite.** Recréer l'organisation ailleurs invaliderait le registre des
traitements et la politique de confidentialité.

## Les deux décisions de conception à ne pas défaire

### 1. Le garde-fou est une préférence locale, pas la table `consents`

Les deux SDK démarrent **avant toute session**, or les policies de `consents` sont indexées
sur `auth.uid()` : un plantage sur l'écran de connexion échapperait au réglage. D'où :

- `apps/mobile/src/features/privacy/telemetry-state.ts` — **module pur, sans import natif**, état en
  mémoire lu de façon **synchrone** (le `beforeSend` de Sentry n'attend personne). Opt-out
  assumé : actif tant qu'aucun `'false'` explicite n'a été lu, ce qui couvre les plantages
  survenus avant la fin de l'hydratation.
- `apps/mobile/src/features/privacy/telemetry-preference.ts` — persistance AsyncStorage, modèle
  `profile/theme-preference.ts`.
- La table `consents` reste la **trace horodatée** du choix (exigence RGPD), écrite au
  mieux : un échec réseau ne doit jamais empêcher quelqu'un de couper la télémétrie.

Cette séparation explique aussi pourquoi les tests ne portent que sur `telemetry-state.ts` :
le projet ne mocke rien (`vitest` en environnement `node`), donc toute la logique testable
doit vivre dans un module sans import React Native.

### 2. Le catalogue d'événements est typé

`apps/mobile/src/lib/analytics-events.ts` est une **union discriminée** : chaque événement déclare
exactement les propriétés qu'il accepte, toutes en booléens ou littéraux fermés. Passer un
`user_id`, un pseudo ou un e-mail est une **erreur de compilation**, verrouillée par des
`@ts-expect-error` dans `analytics-events.test.ts` — c'est `tsc` qui les valide (il signale
une directive inutile si le code compilait), pas vitest.

**Ne jamais élargir le type des propriétés pour faire passer un cas.** Si un besoin semble
l'exiger, c'est le besoin qu'il faut revoir.

## Ajouter un événement

1. Ajouter une entrée au catalogue (`analytics-events.ts`), avec un commentaire disant
   quand il part.
2. L'appeler via `trackEvent({ name: '…' })` depuis le `onSuccess` de la mutation
   concernée — jamais depuis un composant si un hook existe déjà.
3. Vérifier que le nouvel événement ne sort pas du cadre déclaré au §7 de
   `docs/rgpd/registre-des-traitements.md` (« mesure d'usage »). S'il en sort, mettre à jour
   le registre **et** la politique publique avant de livrer.
4. `npm run typecheck && npm run test` depuis `apps/mobile` (ou `npm run verify` à la racine).

Les 13 événements actuels : `account_created`, `signed_in`, `prediction_saved` (`first`
déduit de `created_at === updated_at`, le trigger `predictions_set_updated_at` ne touchant
`updated_at` qu'à l'UPDATE), `joker_changed` (`action` : `set` / `moved` / `cleared`), `league_created`, `league_joined` (`via`), `league_invite_shared` (`from`), `leaderboard_viewed`
(`scope`), `notifications_enabled`, `data_exported`, `account_deleted`,
`welcome_guide_closed` (`completed` : suivi jusqu'au bout ou sorti par un de ses boutons,
vs. passé ou glissé), `feedback_sent` (`withEmail`, jamais le contenu du message).

`account_deleted` part **avant** le `signOut` : après, `Stack.Protected` bascule sur
`(auth)` et démonte l'arbre, ce qui coupe l'envoi en vol.

## Périmètre Sentry

Plantages et erreurs **seulement** : `tracesSampleRate: 0`,
`enableAutoPerformanceTracing: false`, pas de rejeu de session. `sendDefaultPii: false` et
**`Sentry.setUser` n'est jamais appelé** — c'est ce qui permet de déclarer les diagnostics
en « non liés à l'utilisateur » sur l'App Store.

`initDiagnostics()` est appelé au **scope module** de `app/_layout.tsx` (avant tout rendu,
pour attraper les plantages de démarrage) et le `RootLayout` est exporté via
`Sentry.wrap(...)`. La coupure passe par `beforeSend`/`beforeBreadcrumb`, jamais par une
ré-initialisation : c'est la seule façon de ne pas devoir attendre AsyncStorage avant de
pouvoir capturer quoi que ce soit.

## Signalements de problèmes (User Feedback)

Le bouton « Signaler un problème » (`apps/mobile/src/features/feedback/`, registre §11)
passe par `Sentry.captureFeedback`, **pas** par le `FeedbackWidget` du SDK (styles propres,
hors i18next). Règles à ne pas défaire :

- **L'identité ne passe que par le feedback** (`email`/`name` de `captureFeedback`, et
  seulement si la case est cochée), **jamais par `setUser`** : sinon les rapports de
  plantage deviendraient « liés à l'utilisateur » et les déclarations des stores tomberaient.
- **Contexte d'écran en liste blanche** (`FORWARDED_PARAMS` de `build-feedback-context.ts`) :
  le code d'invitation (`/league/new?code=…`) donne accès à une ligue et ne doit jamais
  partir. Ajouter un paramètre = une décision, pas un oubli.
- **Un feedback ne traverse pas `beforeSend`** (réservé aux erreurs dans `@sentry/core`,
  `processBeforeSend`) : il part même diagnostics coupés. C'est voulu (geste explicite) et
  c'est écrit dans la politique. Ne pas « corriger » en filtrant ailleurs.
- `beforeSend` note l'identifiant de la dernière erreur envoyée (`recent-error.ts`) : un
  signalement dans les 10 minutes y est relié par `associatedEventId`.
- Sans DSN, le bouton et la ligne des Réglages disparaissent (`isFeedbackAvailable`).
- Contrôle : Sentry → User Feedback, filtré par environnement (`development` en local).
  Sans alerte e-mail configurée côté Sentry, les signalements y dorment.

## Pièges de build

### Erreur 65 : `An organization ID or slug is required`

`sentry-cli` tente d'envoyer les source maps à **chaque** build et fait échouer tout le
build tant qu'aucune organisation n'est configurée.

- Le drapeau `SENTRY_DISABLE_AUTO_UPLOAD=true` est porté par les scripts
  `npm run ios` / `npm run android` **et** par les profils `development` / `preview`
  d'`eas.json`. **Toujours passer par ces scripts**, jamais `npx expo run:*` à la main.
- ⚠️ **Le mettre dans `.env` ne marche pas** : Expo ne transmet que les variables
  `EXPO_PUBLIC_*` à la phase de build Xcode.
- `ios/.xcode.env.local` fonctionnerait aussi mais est effacé par `prebuild --clean`.
- Le drapeau sautera le jour où les source maps de release seront branchées :
  `organization` + `project` dans le plugin `app.json` et `SENTRY_AUTH_TOKEN` en secret EAS.

### Vérifier la télémétrie au simulateur

`trackEvent` logue `[analytics] <nom> <props>` en `__DEV__` : la sortie Metro suffit pour
voir partir les événements. Pour Sentry, passer temporairement `debug: true` dans
`Sentry.init` et déclencher une erreur volontaire — le journal montre alors
`Captured error event` puis, interrupteur coupé,
`before send for type 'error' returned 'null', will not send event`. **Retirer le `debug`
et l'erreur de test avant de commiter.**

Le transport natif ne remonte pas dans Metro : la réception effective se constate dans les
tableaux de bord Aptabase et Sentry, pas depuis le poste de dev.

Piège d'automatisation constaté : un écran d'onglet déjà monté ne rejoue pas son
`useEffect`. Pour re-déclencher `leaderboard_viewed`, changer la portée (Ligues ↔ Général)
plutôt que renaviguer vers l'onglet.

## ⚠️ Lire le tableau de bord Aptabase : deux vues séparées, Debug et Release

Le SDK marque chaque événement d'un `isDebug: __DEV__`, et le tableau de bord **sépare
complètement les deux jeux de données**. On bascule par l'icône **Bug / Fusée** en haut à
droite, à côté du sélecteur de dates ; le mode Debug porte un ruban orange.

- dev client (émulateur Android, simulateur iOS) ⇒ **Debug**
- build `preview` / `production`, donc le test interne Play ⇒ **Release**

D'où le faux négatif vécu le 2026-09-08 : « Aptabase ne marche pas sur le build du test
interne » alors que la vue ouverte était celle des émulateurs. Avant de soupçonner la
configuration, **vérifier la vue**.

Deux compléments qui font partie du même diagnostic :

- **Aucun événement n'est émis au démarrage** — pas de `session_start`, pas de `app_open`.
  Une session n'apparaît que si un `trackEvent` part. Sur un appareil déjà connecté et qui
  a déjà vu le guide, ouvrir l'app puis la fermer ne produit **rien** : c'est normal, pas
  une panne. Les seuls événements atteignables en usage ordinaire sont `leaderboard_viewed`
  et `prediction_saved`.
- **La cadence d'envoi diffère** : `flushInterval` vaut 2 s en `__DEV__` mais **60 s** en
  release (ou au passage en arrière-plan). Tuer l'app juste après une action peut perdre le
  lot. Laisser l'app ouverte une minute, puis la mettre en arrière-plan sans la balayer.

Pour vérifier qu'un build distribué embarque bien la clé, sans toucher au téléphone :
récupérer le manifeste de l'update servie à son runtime (`u.expo.dev/<projectId>` avec les
en-têtes `expo-runtime-version` / `expo-platform` / `expo-channel-name`), télécharger le
`launchAsset` avec l'`authorization` que donne la partie `extensions` du multipart, puis
`strings` sur le bundle Hermes. La clé `A-EU-…` y est en clair si elle a été inlinée.

## Obligations RGPD attachées

**Un traitement se déclare avant sa mise en service.** Toute évolution de la télémétrie
impose de mettre à jour, dans le même lot :

1. `docs/rgpd/registre-des-traitements.md` (§7 mesure d'usage, §8 diagnostics)
2. `docs/rgpd/sous-traitants.md`
3. `apps/web/src/pages/confidentialite.astro` (§8) — ⚠️ piège Astro : un retour à la ligne
   adjacent à une balise inline supprime l'espace au rendu
4. `docs/rgpd/fiches-stores.md` si l'app est publiée

Vérification : `bash scripts/e2e-privacy.sh` (11/11) couvre l'insertion des consentements
`analytics` / `diagnostics` et le refus d'un type hors catalogue (`23514`).
