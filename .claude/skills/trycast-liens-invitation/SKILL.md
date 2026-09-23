---
name: trycast-liens-invitation
description: Liens d'invitation de ligue TryCast côté app — URL https://www.trycast.fr/rejoindre/<CODE> (buildInviteUrl), ses quatre répliques (vercel.json, intentFilters d'app.json, INVITE_PATH_SEGMENT), +native-intent.tsx, pending-invite-store, usePendingInvite, markInviteHonored, partage par Share.share. À consulter dès qu'on touche au partage ou à l'ouverture d'une invitation, à apps/mobile/src/app/+native-intent.tsx, apps/mobile/src/features/leagues/invite-link.ts, apps/mobile/src/lib/urls.ts, aux intentFilters/associatedDomains d'app.json. Côté site (.well-known, page rejoindre.astro, contrôles curl) : skill trycast-site-web.
---

# TryCast — liens d'invitation de ligue (côté app)

Le côté site (page `rejoindre.astro`, `.well-known/` généré, recette `curl` de contrôle, vignettes
OpenGraph) est dans le skill `trycast-site-web`, section « Liens d'invitation ».

## Une URL, quatre répliques

- Forme unique : `https://www.trycast.fr/rejoindre/<CODE>`, construite par `buildInviteUrl()` de
  `apps/mobile/src/lib/urls.ts` — **seul endroit** qui connaît cette URL côté app.
- Elle est répliquée à trois autres : le `rewrite` de `apps/web/vercel.json` (le site est
  statique, donc pas de `getStaticPaths` sur un code arbitraire : une page unique
  `apps/web/src/pages/rejoindre.astro` sert `/rejoindre/:code` et lit le code côté client), le
  `pathPrefix` des `intentFilters` d'`app.json`, et `INVITE_PATH_SEGMENT` de
  `apps/mobile/src/features/leagues/invite-link.ts`. **En changer une impose les quatre.**

## Hôte

- **L'hôte est `www.trycast.fr`**, domaine primaire ; l'apex y redirige et n'est **pas** déclaré
  côté natif : ni Apple ni Google ne suivent une redirection pour lire `.well-known/`, et les liens
  d'e-mail doivent par ailleurs coïncider avec `additional_redirect_urls` de `supabase/config.toml`.
- ⚠️ **`pathPrefix: '/rejoindre'` est impératif** dans l'intent filter Android : déclarer le
  domaine entier ferait intercepter par l'app la landing et les pages légales, que le site doit
  continuer d'ouvrir dans le navigateur.

## Ouverture d'un lien

- `apps/mobile/src/app/+native-intent.tsx` réécrit le lien entrant en
  `/league/new?tab=join&code=…` **et retient le code au passage** (`pending-invite-store`,
  péremption 24 h) : sans session, les `<Stack.Protected>` renvoient sur `(auth)` et l'intention
  serait perdue. `usePendingInvite` le rejoue après l'inscription — **après que le guide d'accueil
  est résolu**, même piège que la permission notifications (skill `trycast-regles-metier`).
- ⚠️ **Expo Router traite le lien APRÈS le montage de `(app)`**, pas avant : l'ordre mesuré est
  « nettoyage → `redirectSystemPath` → écriture » (traces du 2026-09-09). Tout nettoyage de
  l'invitation en attente qui s'en remet à cet ordre est donc illusoire — le code réécrit après
  coup survit et se rejoue à la navigation suivante, renvoyant sur « Rejoindre » un utilisateur
  qui vient d'ouvrir sa ligue. D'où `markInviteHonored` : **une invitation déjà présentée ne se
  rejoue pas**, quel que soit l'ordre. Ne pas remplacer cette mémoire par un `await` ou un délai.

## Partage

- ⚠️ **Ne pas passer `url` à `Share.share`** : iOS met alors le lien nu en avant et certaines
  cibles le substituent au message, faisant disparaître le nom de la ligue. L'URL vit **dans** le
  message ; ce sont les messageries qui la détectent pour bâtir l'aperçu, pas le système.

## Vérification des domaines

- **`.well-known/` est généré, pas versionné** (`apps/web/scripts/build-well-known.mjs`, lancé en
  `prebuild`) à partir de `APPLE_TEAM_ID` et `ANDROID_CERT_FINGERPRINTS`, variables du projet
  Vercel. Déclarer **toutes** les empreintes SHA-256 (Play App Signing, clé d'importation, build de
  test), même piège que les clients OAuth Android. Détails et contrôles : skill `trycast-site-web`.
- **iOS reste inerte** tant qu'aucun abonnement Apple Developer ne fournit de Team ID : le code est
  complet, il ne manquera qu'une valeur à renseigner.
