---
name: trycast-regles-metier
description: Règles de jeu actées de TryCast — joker par phase (×2, competition_phases, phase_jokers, set_/clear_phase_joker), phases finales (competition_stages, roundGroupKey, buildRoundStrip), réactions sur les pronos (prediction_reactions, REACTIONS, ReactionEmoji), coup de la journée (league_round_highlights, buildRoundHighlights, notification round_highlight), points provisoires en live et rang d'avant journée (PointsEarnedCard, buildBreakdownRows, get_my_previous_rank), bloc « Ce qu'a joué la communauté » (get_match_community_histogram, summarizeCommunity), guide d'accueil (features/welcome), état local par compte (features/celebration) et modération (filtre des pseudos username_is_clean, blocage user_blocks et useMaskBlocked, signalement user_reports et moderate_profile). À consulter dès qu'on touche à apps/mobile/src/features/{jokers,reactions,leagues,welcome,celebration}/, au blocage ou au signalement (features/profile), à un hook qui montre des joueurs, au scoring, à ces tables/RPC, à l'EF notify, ou à scripts/seed-competitions.sql.
---

# TryCast — règles de jeu actées

Décisions prises avec Corentin : **ne pas les re-débattre**. Chaque règle a son miroir serveur
(RLS/RPC) et côté app ; changer l'un sans l'autre est une régression.

## Joker par phase (×2, v1.1.0)

- Un match doublé par **phase de compétition**, et une phase est une **fenêtre de dates**
  (`competition_phases`, seedée dans `scripts/seed-competitions.sql`), **pas** `matches.round` — le
  `week` brut de Highlightly ne dit rien des phases finales. Une compétition sans phase n'a pas de
  joker (bouton masqué).
- Un par phase partout, garanti par la PK `(user_id, phase_id)` de `phase_jokers` ; écritures
  **uniquement** par les RPC `set_phase_joker` / `clear_phase_joker` (deadline au kickoff, prono
  requis, joker **consommé** dès que son match a commencé).
- Scoring : plancher à 0 **puis** ×2 (`JOKER_MULTIPLIER`, constante et non clé du barème),
  `jokerMultiplier` dans le breakdown.
- Identité visuelle : **vert marque**, jamais grenat.
- Domaine app : `apps/mobile/src/features/jokers/` (« phase de compétition » ; `MatchPhase`
  désigne autre chose).
- ⚠️ Une nouvelle compétition doit recevoir ses phases **avant** son premier match, sinon le joker
  n'y existe pas.

## Phases finales (DS du 2026-09-21)

- Les étapes à élimination directe (`r16`, `qf`, `sf`, `final`, et `finals` pour un week-end de
  finales de classement) sont des **fenêtres de dates** dans `competition_stages`, **table distincte
  de `competition_phases`** (la granularité des étapes ne dicte pas celle du joker ; décision actée).
- `get_league_round_points` regroupe par étape les matchs qui y tombent (`round` renvoyé à null,
  `stage_key`/`stage_kind` renseignés) ; côté app, `roundGroupKey` et `buildRoundStrip` de
  `apps/mobile/src/features/leagues/` en sont le miroir, et le hero d'un match affiche le titre de
  l'étape au lieu de « Journée N ».
- Seedées dans `scripts/seed-competitions.sql`. ⚠️ Une compétition doit recevoir ses étapes
  **avant** son premier match à élimination directe, sinon ces matchs retombent dans le
  regroupement par `round` brut.

## Réactions sur les pronos (v1.1.0)

- Quatre clés fermées, dans l'ordre d'affichage `bravo` 👏, `lucky` 🍀, `bold` 😲, `laugh` 😂
  (`REACTIONS` de `apps/mobile/src/features/reactions/reactions.ts`, miroir du `check` SQL).
- **Jamais de texte libre** : ce serait du contenu à modérer (App Store 1.2).
- Le serveur stocke la **clé**, jamais l'emoji ; l'emoji ne se rend que par `ReactionEmoji` (carré
  de taille fixe), seul endroit à changer le jour des pictos maison.
- Une réaction par personne et par prono, **rattachée à la ligue** (PK `league_id, match_id,
  target_user_id, reactor_id`), après le coup d'envoi, jamais sur son propre prono ni sur une
  ligne « — ».
- Table `prediction_reactions` **sans aucun grant client** : écritures par
  `set_/clear_prediction_reaction`, lectures par `get_match_league_predictions` (compteurs,
  `my_reaction`) et `get_prediction_reactors`. Ces deux lectures écartent les réactions des joueurs
  que l'appelant a bloqués (voir « Modération ») : toute réécriture doit garder ce filtre.
- Les réactions **survivent au départ** de leur auteur et sont alors anonymisées à la lecture
  (« Ancien membre ») ; la suppression du compte les efface.
- Placement (DS du 2026-09-20) : **barre de réaction** en deuxième ligne de la ligne membre —
  bouton à gauche (il **porte ma réaction**, contour d'encre plein ; pointillés tant que je n'ai pas
  réagi), **pile de pastilles + total** à droite, qui ouvre la sheet. Couleurs : jamais grenat ni
  vert, « ma réaction » = contour d'encre.

## Coup de la journée (v1.1.0)

- Dans une ligue et pour une journée (même regroupement que l'onglet Résultats, étapes KO
  comprises), le prono qui a trouvé la bonne issue **contre la majorité stricte de la ligue**
  (≥ 3 pronos de membres, gagnants < moitié) et rapporté le plus de points, **joker compris**.
- Au plus **3 ex æquo**, sinon rien ; **aucune carte de repli** : pas de coup, pas de carte, pas de
  notif — ça doit rester rare.
- Une journée n'est complète que si tous ses matchs (hors reportés/annulés) sont scorés **et**
  qu'aucun prono de la ligue n'attend son bonus offensif.
- **Rien n'est stocké** : `league_round_highlights` (interne, sans grant client) calcule,
  `get_league_round_highlights` garde l'appartenance ; mise en scène côté app par
  `buildRoundHighlights` (`apps/mobile/src/features/leagues/round-highlight.ts`, préséance du
  titre : exact > nul > outsider > joker > contre la ligue).
- Les accroches nomment le lauréat par son **pseudo, jamais « il/lui »**.
- Notification par l'EF `notify` (`notify_round_highlight_targets`, préférence
  `round_highlight_enabled`) : dans `notification_sends`, `match_id` porte l'**ancre** (dernier
  match de la journée) et `league_id` distingue les ligues ; unicité
  `(user_id, match_id, type, league_id)` **nulls not distinct**, d'où l'`onConflict` à 4 colonnes
  pour **tous** les types.
- Deux bornes contre l'envoi rétroactif : scoring de moins de 24 h **et** dernier match de moins de
  7 jours (un re-scoring de barème rafraîchit `scored_at` de tout l'historique).
- Deep link `/league/<id>?tab=results&round=<clé>`, validé par `notificationHref` ; l'écran de
  ligue suit ces params même déjà ouvert.
- Vérification : `supabase db query --linked -f scripts/e2e-round-highlights.sql` (transaction
  annulée), démo dans la ligue « Les Potes du Samedi » (`RUGBY226`) de `scripts/seed-demo.mjs`.

## Points en direct et rang d'avant journée (DS du 2026-09-23)

- **Points provisoires en live** (décision de Corentin du 2026-09-23, qui lève celle de juillet
  « pas de projection live ») : pendant un match en cours, la carte « Points gagnés » du détail
  (`PointsEarnedCard`) calcule les points **côté client**, avec `computeMatchPoints` du module
  partagé contre le score live, joker compris. Rien n'est écrit : le scoring serveur reste seul à
  persister. Les essais étant inconnus en direct, le **bonus offensif reste « en attente »**. Match
  terminé : breakdown persisté ; reporté ou annulé : prono en lecture seule
  (`LockedPredictionCard`), sans points, et pronos de ligue masqués.
- Lignes du barème : une seule fonction pure, `buildBreakdownRows`
  (`apps/mobile/src/features/predictions/breakdown-rows.ts`), partagée par la sheet de détail et la
  carte. La ligne du **bonus défensif est omise** quand l'écart pronostiqué dépasse
  `defensiveBonusMaxGap` : le bonus y était impossible d'avance.
- **Rang d'avant journée** (tendance « +N places » de la carte « Tes points » de l'accueil) : RPC
  `get_my_previous_rank(p_competition_id, p_before)`, `security definer`, qui **recalcule** le
  classement général depuis les pronos scorés dont le match a commencé avant `p_before` (premier
  coup d'envoi de la journée, fourni par `summarizeRound` de
  `apps/mobile/src/features/leagues/round-summary.ts`). Seul le rang de l'appelant sort.
  ⚠️ **Ses critères recopient ceux du classement** : total, puis scores exacts, puis le moins de
  pronos scorés (`apply_match_scores` → `standings`), comptes de démo exclus comme dans
  `get_global_leaderboard`. Changer un critère de l'un sans les autres fait mentir le delta.
  Vérification : `supabase db query --linked -f scripts/e2e-previous-rank.sql` (transaction
  annulée, sans seed). Sans la RPC (prod pas encore migrée), la carte retombe sur « À X pts du Nᵉ ».

## Ce qu'a joué la communauté (DS du 2026-09-24)

- Bloc du détail d'un match **commencé** : parts 1/N/2, score le plus joué, scores exacts trouvés,
  points moyens. RPC `get_match_community_histogram(p_match_id)`, `security definer`, qui ne rend
  que des **agrégats** (nombre de pronos par score, bonus offensifs, joker et points attribués),
  jamais une ligne individuelle ni un identifiant ; comptes de démo exclus.
- ⚠️ **Les scores pronostiqués des autres restent secrets jusqu'au coup d'envoi** : la RPC ne rend
  **rien** avant le kickoff, ni pour un match reporté ou annulé. Seules les parts 1/N/2
  (`get_prediction_distributions`) sont visibles avant, par décision de Corentin. Ne pas avancer
  le bloc avant le match, ni relâcher le filtre côté serveur ; le `enabled` de
  `use-match-community.ts` n'est qu'une UX.
- Le calcul vit côté client, dans `summarizeCommunity`
  (`apps/mobile/src/features/predictions/community-summary.ts`, testé) : un groupe scoré garde ses
  `points_awarded` (essais et joker compris) ; en live, ses points se recalculent contre le score en
  direct avec le module de scoring partagé, bonus offensif en attente, comme la carte « Points
  gagnés » (`match-points-of.ts`).

## Guide d'accueil (`apps/mobile/src/features/welcome/`)

- Quatre volets dans une bottom sheet paginée, ouverts une fois au premier lancement et rejouables
  depuis Réglages → À propos, **par-dessus les Réglages** (plus de retour à l'écran précédent).
- Les volets ne renvoient nulle part ailleurs : seul celui des notifications porte une action
  (`WelcomeStepAction`). Les règles et les ligues sont proposées **au dernier volet**, en double
  bouton à la place de « Passer » (`WelcomeAction`), pour qu'on lise tout avant de partir.
- L'état « déjà vu » est une **préférence locale** (`trycast.welcome-guide-seen`), pas une colonne
  serveur : c'est cosmétique, et une réinstallation le rejoue — assumé.
- ⚠️ **Ce flag pilote aussi la première demande de permission notifications** :
  `useRegisterPushToken` la suspend tant que le guide n'a pas été vu, et c'est la fermeture du
  guide qui relaie l'appel — sinon le dialogue système surgit à froid par-dessus la sheet de
  bienvenue. Ne pas rétablir l'appel direct au montage. Même contrainte pour l'invitation en
  attente (skill `trycast-liens-invitation`).

## Modération : filtre des pseudos, blocage, signalement (v1.3.0)

Règle 1.2 de l'App Store (contenu créé par les utilisateurs : pseudos et photos, visibles de tous
dans le classement général). Migrations `20260926000100_username_filter.sql` et
`20260926000200_moderation.sql`, vérification `supabase db query --linked -f
scripts/e2e-moderation.sql` (transaction annulée, sans seed).

- **Filtre des pseudos** : contrainte `profiles_username_clean` (fonction immutable
  `username_is_clean`, posée `not valid`), qui couvre les trois chemins d'écriture du pseudo. Deux
  listes : des sous-chaînes cherchées dans le pseudo sans ses « _ », et des mots courts refusés
  seulement en segment entier, pour ne pas attraper « constant », « Scunthorpe » ou « supporter » ;
  le leetspeak est ramené avant comparaison. **Enrichir une liste = `create or replace function`
  dans une nouvelle migration**, jamais en éditant l'ancienne. Plafond connu : deux mots collés
  (« salepute ») passent, le signalement prend le relais.
- La fonction est exposée en RPC (anon compris) : l'écran d'inscription la vérifie **avant**
  `signUp`, sinon le refus du trigger de création de profil remonte de GoTrue en « Database error
  saving new user ». Ailleurs, le 23514 se distingue du check de format par le nom de la contrainte
  dans le message (`toProfileMessageKey`).
- **Pas de filtre sur les noms de ligue**, exprès : ils ne sont visibles qu'avec le code, et on
  peut quitter la ligue.
- **Blocage à sens unique**, préférence d'affichage et non règle de sécurité : le joueur bloqué
  devient « Joueur masqué » sans photo partout pour le bloqueur, **rang conservé**, profil toujours
  ouvrable (pour débloquer). Il n'en sait rien.
  - Masquage **côté client** : `useMaskBlocked` passé en `select` aux hooks qui montrent des
    joueurs (classements général et de ligue, points de la journée, coup de la journée, pronos d'un
    match) ; le profil public lit `useBlockedIds` directement. **Un nouveau hook qui montre des
    joueurs passe par `useMaskBlocked`**, sinon le joueur réapparaît en clair.
  - Réactions filtrées **côté serveur** (`get_match_league_predictions`,
    `get_prediction_reactors`) : un compteur agrégé ne se corrige pas côté client.
  - Après blocage ou déblocage, tout le cache est invalidé. Seul l'écran « Joueurs bloqués »
    (Réglages → Confidentialité, route `(app)/blocked-players`) montre le vrai pseudo.
  - Fuite mineure acceptée : les lectures triées par `lower(pr.username)` gardent un joueur masqué
    à sa place alphabétique d'origine.
- **Signalement de joueurs seulement** (pas de ligue, décision de Corentin), motifs en **liste
  fermée** `username` / `avatar`, jamais de texte libre, depuis le volet d'actions du profil public
  (`player-actions-sheet.tsx`, un seul volet, pas de popover). Aucune lecture client ; un doublon
  (23505) est un succès.
- **Alerte** : le trigger `notify_user_report` envoie par pg_net un e-mail de `contact@` vers
  `contact@` via l'API Resend (secret Vault `resend_api_key`), **sans l'identité du signaleur**, avec
  les requêtes de traitement prêtes à copier. Secret absent : rien ne part, le signalement reste.
  Ce motif pg_net → Resend est réutilisable (e-mail de bienvenue).
- **Traiter un signalement** (Corentin, SQL editor du projet) :
  `select public.moderate_profile('<id>', p_username => true, p_avatar => false);` remet
  `user_xxxxxxxx` avec `username_chosen = false` (le joueur repasse par le choix du pseudo), vide
  `avatar_url` si demandé et supprime les signalements traités. Réservée à `service_role`. **La
  photo se retire à la main** dans Storage → `avatars` → `<id>` (le SQL ne peut pas supprimer dans
  `storage.objects`). Rejeter : `delete from public.user_reports where id = '<id>';`.
- Export RGPD : les blocages et signalements **faits** par l'utilisateur, jamais ceux qui le visent
  (registre §12).

## État local et compte

- Une préférence locale qui décrit ce qu'**un utilisateur** a vu ou fait se range **par compte**
  (clé suffixée par l'id), jamais par appareil — le récap « Depuis ta dernière visite »
  (`apps/mobile/src/features/celebration/`, clé `trycast.celebrated-matches.<userId>`) confondait
  deux comptes d'un même téléphone.
- Restent par appareil, **exprès** : le guide d'accueil, le thème et les interrupteurs de
  télémétrie (qui doivent valoir avant toute session).
