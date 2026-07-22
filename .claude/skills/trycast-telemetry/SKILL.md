---
name: trycast-telemetry
description: Mesure d'usage (Aptabase, région EU) et rapports de plantage (Sentry, région EU) de TryCast — catalogue d'événements typé, garde-fou par préférence locale et non par la table consents, ajout d'un événement, pièges de build sentry-cli, obligations RGPD associées. À consulter dès qu'on ajoute ou modifie un événement de mesure, qu'on touche à src/lib/analytics*.ts ou diagnostics.ts, aux interrupteurs de Réglages → Confidentialité, ou qu'un build échoue en erreur 65.
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
| Enveloppe | `src/lib/analytics.ts` | `src/lib/diagnostics.ts` |
| Module natif | **Non** (0 dépendance de prod) | **Oui** ⇒ rebuild du dev client |

⚠️ **La résidence des données Sentry se choisit à la création de l'organisation et n'est
pas modifiable ensuite.** Recréer l'organisation ailleurs invaliderait le registre des
traitements et la politique de confidentialité.

## Les deux décisions de conception à ne pas défaire

### 1. Le garde-fou est une préférence locale, pas la table `consents`

Les deux SDK démarrent **avant toute session**, or les policies de `consents` sont indexées
sur `auth.uid()` : un plantage sur l'écran de connexion échapperait au réglage. D'où :

- `src/features/privacy/telemetry-state.ts` — **module pur, sans import natif**, état en
  mémoire lu de façon **synchrone** (le `beforeSend` de Sentry n'attend personne). Opt-out
  assumé : actif tant qu'aucun `'false'` explicite n'a été lu, ce qui couvre les plantages
  survenus avant la fin de l'hydratation.
- `src/features/privacy/telemetry-preference.ts` — persistance AsyncStorage, modèle
  `profile/theme-preference.ts`.
- La table `consents` reste la **trace horodatée** du choix (exigence RGPD), écrite au
  mieux : un échec réseau ne doit jamais empêcher quelqu'un de couper la télémétrie.

Cette séparation explique aussi pourquoi les tests ne portent que sur `telemetry-state.ts` :
le projet ne mocke rien (`vitest` en environnement `node`), donc toute la logique testable
doit vivre dans un module sans import React Native.

### 2. Le catalogue d'événements est typé

`src/lib/analytics-events.ts` est une **union discriminée** : chaque événement déclare
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
4. `npm run typecheck && npm run test`.

Les 9 événements actuels : `account_created`, `signed_in`, `prediction_saved` (`first`
déduit de `created_at === updated_at`, le trigger `predictions_set_updated_at` ne touchant
`updated_at` qu'à l'UPDATE), `league_created`, `league_joined`, `leaderboard_viewed`
(`scope`), `notifications_enabled`, `data_exported`, `account_deleted`.

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

## Obligations RGPD attachées

**Un traitement se déclare avant sa mise en service.** Toute évolution de la télémétrie
impose de mettre à jour, dans le même lot :

1. `docs/rgpd/registre-des-traitements.md` (§7 mesure d'usage, §8 diagnostics)
2. `docs/rgpd/sous-traitants.md`
3. `web/src/pages/confidentialite.astro` (§8) — ⚠️ piège Astro : un retour à la ligne
   adjacent à une balise inline supprime l'espace au rendu
4. `docs/rgpd/fiches-stores.md` si l'app est publiée

Vérification : `bash scripts/e2e-privacy.sh` (11/11) couvre l'insertion des consentements
`analytics` / `diagnostics` et le refus d'un type hors catalogue (`23514`).
