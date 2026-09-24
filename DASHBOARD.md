# TryCast — Dashboard

> État courant du projet : avancement, feuille de route, ce qu'il reste, décisions, dette.
> Mis à jour à la fin de chaque lot. **Pas de journal** : l'historique se lit dans `git log`
> (et l'ancien journal des sessions par `git show 8418902:DASHBOARD.md`).
>
> État au **2026-09-24** : serveur **entièrement en prod**, bloc communauté compris. **Release
> 1.2.0 publiée** (tag `v1.2.0`) et **déployée sur la Play Console** : c'est le premier build ouvert
> aux testeurs. Elle embarque `expo-blur`, donc une nouvelle empreinte : les builds 1.1.0 (7) et
> 1.0.0 (5) ne reçoivent plus aucune OTA venue de `main`.

## Avancement des lots

| Lot | Sujet | État |
|-----|-------|------|
| 0-5.5 | Fondations, auth, pipeline compétition, pronos + RLS, scoring, ligues, DS + i18n | ✅ Livrés |
| 6 | Push (tokens, EF `notify`, deep links, préférences, boîte de réception) | ✅ Validé sur Android réel |
| 7 | Finitions (e-mails Resend, reset par code, RGPD, anglais) | ✅ Déployé — iOS/APNs différé |
| 8 | Connexion Google (socle multi-fournisseur, choix du pseudo) | ✅ Validé sur Android réel — Apple différé |
| Web | Site Astro bilingue (landing, waitlist, légal, invitations) | ✅ En ligne sur `www.trycast.fr` |
| **9** | **Mise en beta Play** | 🔶 Phases 1 à 6 livrées (test interne, OTA, dev/prod séparés) ; reste la **phase 7, beta fermée début octobre 2026** |

## Feuille de route (actée le 2026-09-14)

Un jalon = un build ; ce qui n'y figure pas n'est pas au programme.

### v1.1.0 — build de la beta fermée (visé début octobre 2026)
Le build qu'installeront les testeurs, et celui des journées de novembre du Nations Championship.
- ✅ **Joker par phase** — serveur en prod.
- ✅ **Réactions emoji** — serveur en prod. Pictos maison animés plus tard (sans migration) ;
  notifications de réaction reportées au lancement public.
- ✅ **DS du 2026-09-21** — headers repliables, phases finales dans la bande des journées, etc. Migration en prod.
- ✅ **Coup de la journée** — serveur en prod (2026-09-23).
- ✅ **DS du 2026-09-23** — carte « Tes points » de l'accueil (tendance de rang par journée),
  points provisoires en live dans le détail de match, heure du coup d'envoi « 21h45 », profil
  public en barre native. Migration `get_my_previous_rank` en prod (2026-09-23).
- ✅ **Signaler un problème** (Sentry User Feedback) — reste à vérifier la réception dans Sentry et brancher l'alerte e-mail.
- ✅ **Version 1.1.0** — taguée et buildée le 2026-09-23 (build 7). Reste la Play Console ; préparation du compte Apple à suivre.
- ✅ **DS du 2026-09-24** (après la 1.1.0) — headers repliables en verre (`expo-blur`, lib native),
  bloc « Ce qu'a joué la communauté » du détail de match, carte de prono et rang par ligue du profil,
  avatars de ligue dans les sélecteurs, classement général chargé au défilement, guide d'accueil
  raccourci. Migration `get_match_community_histogram` en prod (2026-09-24) ; nouvelle empreinte,
  donc **une release store** (version à trancher : ce lot doit-il remplacer le build 7 pour la beta ?).

### Lancement public — 6 Nations 2027 (février)
- **Pronos de tournoi** avant le premier match : vainqueur, Grand Chelem, cuillère de bois, résolus
  depuis les scores. Possible : **meilleur marqueur d'essais** (Highlightly n'expose aucune stat
  joueur → groupes chargés par script, résultat saisi à la main ; règle des ex æquo à fixer).
- **Notifications d'activité de ligue** (« X t'a dépassé »).
- **Widget Android / Live Activity iOS** du match en direct (natif ⇒ rebuild ; iOS suit le compte Apple, le live suit Highlightly Pro).
- **Statistiques du profil** (bons vainqueurs, scores exacts, séries).
- **Flows Maestro** sur les parcours clés, à confirmer — condition pour rouvrir les PR automatiques de dépendances.
- **Campagne de lancement** : pistes de Corentin. La waitlist est vide.

### Saison 2027-28 — Top 14
- Accord de principe, pas de lancement en cours de saison. ⚠️ La reprise (fin août 2027) précède
  la RWC d'un mois : Top 14 prêt avant l'été 2027, ou après la RWC. À trancher.
- Vérifier couverture et prix chez Highlightly.
- **Pas de logos de club sans licence** (droit d'auteur + marque) : noms en texte, pastille
  neutre, rien qui suggère un caractère officiel (« Top 14 » ni dans le nom, ni l'icône, ni la
  fiche). Même vigilance pour la RWC.

### Écarté ou reporté
- **Duels 1 contre 1** : écartés.
- **Image de fin de journée à partager**, **aperçu de ligue sur `/rejoindre/<code>`** : pas pour le moment.
- **Chat de ligue** : déconseillé (texte libre ⇒ modération exigée par l'App Store) ; les réactions en liste fermée en tiennent lieu.

## Ce qu'il reste à faire

### 🔶 Beta fermée (Lot 9, phase 7)
- **Recruter 12 testeurs** qui restent inscrits 14 jours. ⚠️ La waitlist est **vide** : lui envoyer du trafic bien avant novembre.
- **Version 1.2.0 sur la Play Console** (2026-09-24), premier build ouvert aux testeurs ; la 1.1.0
  n'a servi qu'à Corentin. Les correctifs JS partent désormais par `npm run ota:prod` vers la 1.2.0.
  Le dev client iOS n'est pas rebuildé (`expo-blur`) et la passe visuelle iOS du DS du 2026-09-24
  n'est pas faite.
- **Avatars absents en prod** dans les classements et la liste des pronos d'un match, y compris celui
  de Corentin. Sur le dev, RPC et rendu sont corrects (vérifié à l'émulateur) ; en prod, l'`avatar_url`
  de Corentin est correct (2026-09-24). Reste à comparer les définitions renvoyées par
  `get_league_leaderboard`, `get_global_leaderboard` et `get_match_league_predictions` en prod avec
  celles du dev (colonne `avatar_url` présente ?).
- `SENTRY_AUTH_TOKEN` en secret EAS — un **jeton d'organisation**, pas personnel. Sans lui, pas de
  source maps : plantages en JS minifié.
- `submit.production.android` d'`eas.json` attend le compte de service Google Play.
- **Alerte sur les crons en échec** (proposé, non tranché) : aucune surveillance ne lit
  `cron.job_run_details` ; une panne a déjà duré un mois sans signal. À cadrer avant la beta.

### 🔜 iOS — beta fermée TestFlight en octobre 2026 (plan du 2026-09-24)
Objectif : des testeurs iPhone (amis, connaissances) **invités par e-mail** dans un groupe
TestFlight externe, comme la beta fermée Play, à temps pour les journées de novembre du Nations
Championship. **App Store public en février 2027**, avec Android. Compte **individuel**, statut DSA
**non-trader** (voir « Décisions clés »).

| Quand | Qui | Étape |
|---|---|---|
| 24–29 sept | Corentin | Inscription au programme (nom légal, double authentification, 99 $/an). **Chemin critique** : validation de quelques jours à deux semaines. |
| Dès le Team ID (~1er oct) | Claude, puis Corentin | **Lot 1 — iOS distribuable** (ci-dessous), fiche App Store Connect, premier `eas build -p ios --profile production` et `eas submit` lancés par Corentin (identifiants de signature interactifs), **TestFlight interne** (sans revue). |
| 5–14 oct | Claude | **Lot 2 — Sign in with Apple**, iOS seulement, RGPD dans le même lot. Rebuild du dev client iOS (il n'a pas encore `expo-blur`), passe au simulateur. |
| 8–14 oct | Corentin + 1 ou 2 proches | iPhone réel en TestFlight interne (testeurs ajoutés comme utilisateurs App Store Connect) : push, lien `/rejoindre`, Google, Apple. Corentin n'a pas d'iPhone. |
| ~15 oct | Corentin | Release **1.3.0**, groupe externe « Beta fermée », soumission à la revue beta : description, `contact@trycast.fr`, compte de démo des stores, note au relecteur (gratuit, aucune mise, les cotes pondèrent les points). |
| ~17–20 oct | Corentin | Invitations par e-mail, sur le même canal que la beta Android (le broadcast Resend ne vise qu'Android : l'adapter). |
| jusqu'au 7 nov | — | Marge pour un rejet et une nouvelle soumission. |

**Lot 1 — iOS distribuable** (configuration seule) :
- `app.json` : `ios.config.usesNonExemptEncryption: false`, bloc `ios.privacyManifests` de
  `docs/rgpd/fiches-stores.md`. ⚠️ Comparer l'empreinte Android avant et après
  (`npx expo-updates fingerprint:generate --platform android`) : si elle bouge, tout part avec la 1.3.0.
- `eas.json` : `submit.production.ios` (identifiant de l'app App Store Connect, Team ID) et clé d'API App Store Connect.
- Clé **APNs** dans les credentials EAS (`eas credentials`) ; l'EF `notify` passe par le service de push Expo, rien côté serveur.
- `APPLE_TEAM_ID` dans Vercel : génère l'`apple-app-site-association` (liens d'invitation dans
  l'app sur iOS). `npm run ios` recompile alors en local sans le contournement `xcodebuild` (skill `trycast-dev-builds`).
- `npm run env:prod` : vérifier `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` dans l'environnement EAS de production.
- `icon.png` a un canal alpha : Expo l'aplatit sur fond blanc pour iOS, contrôler le rendu sur le premier build.

**Lot 2 — Sign in with Apple** (règle 4.8, exigée dès qu'un login social existe) :
`expo-apple-authentication` (lib native ⇒ rebuild du dev client), `ios.usesAppleSignIn: true`,
entrée `apple` dans `providers.ts` (flux `native-id-token`, **iOS seulement** : sur Android, le flux
navigateur exigerait un Services ID et une clé secrète à renouveler tous les six mois), branche
`apple` de `sign-in-with-provider.ts` avec nonce, fournisseur Apple côté Supabase (bundle ID comme
client ID, pas de secret en flux natif). Registre, `confidentialite.astro` et `en/privacy.astro` dans le même lot.

**Session dédiée avant l'App Store public (février)** :
- **Signaler, bloquer, filtre des pseudos** (règle 1.2 : pseudos et avatars visibles des autres
  joueurs ; existants : exclusion par le propriétaire de ligue, contact publié). Motif de rejet le plus probable.
- **Révocation des jetons Apple** à la suppression du compte (API REST d'Apple depuis l'EF `delete-account`, clé .p8 en secret).
- Fiche App Store : captures 6,9″ (pas d'iPad), étiquettes de confidentialité (brouillon dans
  `docs/rgpd/fiches-stores.md`), classification d'âge cohérente avec le minimum de 16 ans.
- ⚠️ Un build TestFlight expire au bout de 90 jours : celui d'octobre tient jusqu'en janvier.

### Liens d'invitation — ouverts, sans urgence
1. **Aperçu dans une messagerie** : vérifier la vignette dans WhatsApp (Facebook Sharing Debugger pour forcer le cache).
2. **Une seule empreinte Android en ligne** dans `assetlinks.json` : déclarer les trois de la Play
   Console (signature actuelle, précédente, importation) dans `ANDROID_CERT_FINGERPRINTS` (Vercel).

### RGPD et légal
- Remplir les fiches stores à la soumission ; automatiser la **purge des comptes inactifs** (règle des 3 ans publiée, cron inexistant).
- Noter le fournisseur de `contact@trycast.fr` dans `docs/rgpd/sous-traitants.md`.
- **Enregistrer la langue d'inscription à la waitlist** (migration `join_waitlist` + registre), pour écrire aux anglophones dans leur langue.
- Faire relire les pages légales anglaises si ce n'est pas fait.

### Divers
- **Push** : confirmer sur l'Android réel les deux boutons d'une notification reçue (« Marquer comme lu » perdu si l'app est tuée : dégradation assumée).
- **Highlightly Pro** : décider du renouvellement avant chaque compétition ; sans lui, `/odds` en 401 (fallback ×2.0) et pas de score live.
- **Points provisoires en live** (carte « Points gagnés » et bloc communauté du détail de match) : à valider avec de vraies données in-play (prochain match NC en direct).
- **Avertissement React au changement de thème** : « Can't perform a React state update on a component that hasn't mounted yet » (`card.tsx`, `profile-stats.tsx`), vu à l'émulateur, à qualifier.
- **Passe iOS sous Xcode 27** : AXe est cassé, et `verif-visuelle` n'a pas l'outil simulateur de Claude Code. Une passe iOS interactive se fait depuis la session principale, jusqu'à une version d'AXe compatible.
- Jeter le worktree `.claude/worktrees/stoic-dewdney-33788e` et les branches `claude/*` de juillet.
- **SDK 58** : pas avant sa sortie réelle ni avant le lancement de la beta.
- **Sous-agents** (`.claude/agents/`) : les trois ont fait leur premier passage réel le 2026-09-23 (`verif-visuelle` a démarré seul émulateur et dev client, ~45 s avec le cache Gradle). Coût côté agent : ~40 k tokens (`relecteur`), ~75 k (`docs-lot`), ~100 k (`verif-visuelle`). Depuis, `relecteur` fait une seconde passe « sur-ingénierie » (grille de `ponytail-review`) qui rend un bloc « Simplifications » non bloquant : son coût est à remesurer. Les plugins Ponytail et Caveman restent réglés chez Corentin, hors dépôt : sans filtre, le hook de démarrage de Ponytail injecte ~1,5 k tokens dans chaque sous-agent.

## Décisions clés (actées, ne pas re-débattre)

*Le détail et le pourquoi sont dans `AGENTS.md`, les skills et la mémoire projet.*

- **Prono unique** par (user, match), partagé entre ligues ; points rétroactifs en rejoignant.
- Saisie = **score exact** + bonus offensif ; points vainqueur **pondérés par les cotes** (fallback 2.0), barème versionné en DB (`scoring_rules`).
- Deadline prono au **kickoff**, imposée par **RLS serveur**.
- **Scoring en 2 temps** : passe 1 immédiate, passe 2 à l'arrivée des essais, **importés de Wikipedia** (écriture seulement si le décompte reconstitue le score), saisie admin SQL en repli. Scraping L'Équipe/Flashscore écarté.
- **Pas d'app d'administration** tant qu'une deuxième tâche d'admin n'existe pas ; ce serait une app **à part**, jamais greffée sur Astro.
- Scoring en **module TS pur** + écriture atomique par **une seule RPC** `apply_match_scores`.
- Source de données : **Highlightly**.
- **4 onglets** : Matchs / Résultats / Classement / Profil. **Auto-save optimiste** du prono.
- Ligues : création/adhésion **uniquement par RPC** ; l'owner ne quitte pas sa ligue, il la supprime ou la transfère.
- **i18n** : FR source, EN livré. **Site bilingue**, pas de redirection automatique, le français seul fait foi sur le légal.
- **Design system v2** : vert = marque, grenat = étincelle jamais un fond. Seule surface verte : la carte « Tes points » de l'accueil, voulue par la maquette. **Pastille active de la tab bar grenat dans les deux thèmes** : c'est le DS qui s'alignera sur l'app.
- **Deux projets Supabase** : prod `bmdzadvugtkclnqjpndr` (ancien dev renommé, orga TryCast en Pro), dev `axxutfngespcdiqtrdao`. **Supabase branching écarté** (pensé pour les PR, branches sans données, URL neuve par branche, réapplique `config.toml`) ; à rouvrir pour tester une migration risquée sur des données de beta réelles.
- **Le téléphone de Corentin n'est pas une cible de développement** : il porte le build du test interne.
- **Points provisoires en live** (2026-09-23, lève « pas de projection live » de juillet) : calculés côté client contre le score live par le module de scoring partagé, rien n'est écrit ; bonus offensif « en attente » faute d'essais en direct.
- **`expo.version` reste dans l'empreinte** : tout bump impose un build, un correctif JS part sans bump par `npm run ota:prod`.
- **Âge minimum 16 ans** (hors programme Familles de Play).
- **Compte Apple Developer individuel** (2026-09-24) : le nom légal du titulaire s'affiche comme
  vendeur sur l'App Store, en connaissance de cause (l'organisation exigerait entité juridique et
  D-U-N-S). Les pages légales du site restent anonymes. **Statut DSA non-trader** tant qu'il n'y a
  ni publicité ni achat intégré ; la monétisation fera basculer trader (coordonnées publiées sur la
  fiche UE) et « professionnel » (mentions légales à réviser dans les deux langues).
- **iOS suit Android** : beta fermée TestFlight sur invitation par e-mail, App Store public en février 2027.

## Points ouverts / dette assumée
- **Chantier des cotes** (reporté) : capturer les cotes plus tôt et ne jamais écraser une bonne cote par du vide. Seul le badge « Outsider des cotes » du coup de la journée en dépend.
- Override npm `react-native-css` → `lightningcss@1.30.1` — à réévaluer quand react-native-css > 3.0.7 sort.
- **Tokens du DS copiés à trois endroits** (`apps/mobile/src/global.css`, `apps/mobile/src/tw/palette.ts`, `apps/web/src/styles/tokens.css`) : seuls les deux premiers sont verrouillés par un test.
- **Plancher `browserslist`** de `package.json` obligatoire : le baisser re-casse silencieusement le dark natif (`light-dark()`).
- Tailwind : neutraliser la palette par défaut (`--color-*: initial`).
- Classement : rang du joueur au-dessus de la barre « moi » approximé à rang − 1 (documenté dans `pinned-me-row.tsx`).
- **Critères du classement recopiés** dans `get_my_previous_rank` (total, scores exacts, moins de pronos scorés, démo exclue) : toucher au départage d'`apply_match_scores` impose de la modifier aussi.
- Identifiants encore en dur : `package.json` (typegen `--project-id`), `app.json` (owner EAS, requis), migration cron `20260705000300`.
- **⚠️ Données de test probablement en prod** (à vérifier par Corentin) : `select slug from public.competitions` (ligne `e2e-test` supprimable) et surtout `select api_game_id, kickoff_at from public.matches where api_game_id < 0` — seedés sur la vraie `nc-2026`, ils remontent dans les listes. L'app filtre les compétitions à id négatif, **pas les matchs**.
- **Seed de démo** (`scripts/seed-demo.mjs`) : en novembre, les vraies journées de nc-2026 tomberont dans sa fenêtre fictive et il refusera de semer — décaler le scénario. Il ne sème ni match reporté ni plus de deux notifications : l'état reporté du détail de match et le badge « 9+ » de la cloche restent invérifiés au simulateur.
- Base dev : ligue « Verif affichage » (`R2FANTMJ`) à retirer ; scores NC de juillet fictifs (le mode `audit` de `sync-tries` se mesure en prod) ; bonus défensif non observable au simulateur (couvert par `breakdown-labels.test.ts` et `breakdown-rows.test.ts`).
- Aptabase : `preview` et `production` se mélangent (tous deux en release) — négligeable tant que `preview` ne sert qu'à Corentin.
