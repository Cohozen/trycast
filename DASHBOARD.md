# TryCast — Dashboard

> Suivi d'avancement et décisions. Mis à jour à la fin de chaque session.
> Dernière mise à jour : **2026-07-09**

## Avancement des lots

| Lot | Sujet | État |
|-----|-------|------|
| 0-1 | Fondations, auth/profils, delete-account | ✅ Livré |
| 2 | Pipeline compétition (sync-fixtures, cron) | ✅ Livré |
| 3 | Prédictions + RLS deadline kickoff, pages Matchs/Résultats | ✅ Livré |
| 4 | Scoring (RPC `apply_match_scores`, EF `sync-results`, passes 1/2) | ✅ Livré, validé en réel J1 NC |
| 5 | Ligues & classements (standings, RPC, leaderboards, Realtime) | ✅ Livré |
| 5.5 | Design system + i18n (tokens light/dark, primitives, 4 onglets, i18next FR) | ✅ **Livré (V0)** |
| **6** | **Push (expo-notifications, tokens, notify-deadline/results, deep links, préférences)** | 🔜 **Prochain** |
| 7 | Finitions (confirmation email, EN si beta anglophone, pages légales, etc.) | ⬜ À venir |

## Ce qu'il reste à faire

### Lot 6 — Push (prochain)
- expo-notifications + enregistrement des tokens
- Edge Functions `notify-deadline` / `notify-results` (contenus localisés via `profiles.locale`, renseignée depuis le Lot 5.5)
- Deep links vers match / ligue
- Écran de préférences de notification → **la section Notifications de l'écran Réglages est déjà maquettée** (`docs/design/project/TryCast Reglages.dc.html` : master switch + 4 types + bannière permission OS refusée)

### Écrans : blocs maquettés en attente de backend (reportés du Lot 5.5)

*Les maquettes de `docs/design/` vont plus loin que ce que les données permettent aujourd'hui. Ce qui suit est **prêt côté design** (et souvent côté clés i18n) mais bloqué par du serveur/data à construire — chaque bloc liste son préalable.*

**Accueil Matchs** (`MesMatchs.dc.html`)
- **Carte LIVE** (minute de jeu, score en cours, points potentiels épinglés en haut) → Highlightly ne fournit **pas de score pendant le match** (`state.score` = null avant/pendant, constaté sur réponses réelles). Préalable : autre source live ou changement de provider — à réévaluer seulement si le besoin devient réel (décision spike 2026-07-05).
- **Barres de distribution des pronos 1/N/2** (répartition de la communauté sous les points potentiels) → agrégat serveur à créer (RPC/vue `security definer` sur `predictions`), **à n'exposer qu'après kickoff** pour ne pas fuiter les pronos (la RLS actuelle interdit — à raison — de lire les pronos des autres avant).

**Résultats / Match Detail** (`TryCast Match Detail.dc.html` — écran entier reporté)
- **Timeline du match** (essais, transformations, pénalités, cartons, minute par minute) → données événements **inexistantes chez tous les providers testés** (spike clos, `docs/spike-highlightly.md`). Pas de préalable atteignable au MVP ; l'écran Résultats reste la vue « score + réconciliation du prono ».

**Profil** (`TryCast Profil.dc.html`)
- **Stats par compétition** (segmented Toutes / 6 Nations / RWC ; points, pronos joués, bons pronos, pronos exacts par compétition) → agrégats par compétition côté serveur : `standings` couvre déjà points/bons pronos pour la compétition active, il manque une RPC d'historique multi-compétitions (ou extension de `standings`).
- **Photo de profil** (Changer/Supprimer, maquette Réglages) → bucket Supabase Storage + colonne `profiles.avatar_url` + policies (+ redimensionnement côté EF si on veut faire propre).

**Réglages** (`TryCast Reglages.dc.html` — livré en V0 minimal : thème, langue affichée, version, déconnexion, zone danger)
- **Notifications** (master + par type + bannière « bloquées dans iOS ») → **Lot 6** (tables de tokens + préférences par type).
- **Changement d'e-mail** (ligne « Modifier ») et **changement de mot de passe** (sheet maquettée avec erreurs) → `supabase.auth.updateUser` + e-mails de confirmation ; à câbler en même temps que la réactivation de la confirmation email (Lot 7).
- **RGPD** : sheet consentements (mesure d'audience, communications, avec dates de recueil) + « Exporter mes données » → table `consents` + EF d'export (envoi par e-mail) ; n'a de sens qu'une fois un analytics en place.
- **Liens légaux** (CGU, politique de confidentialité, mentions légales) → pages à rédiger et héberger (requis App Store — Lot 7). Le footer légal de la maquette Auth attend les mêmes pages.
- **Sélecteur de langue actif** (aujourd'hui « Français » en lecture seule) → livraison de l'EN (infra prête, traduction avant RWC 2027).
- **Compte social-only** (« Géré par Apple », pas de mot de passe) → OAuth Apple/Google (v2), comme les boutons « Continuer avec Apple/Google » de la maquette Auth.

### En attente côté Corentin (actions manuelles)
- [ ] Saisie admin des essais J1 (`scripts/admin-set-tries.sql`) → déclenche passe 2 auto au tick suivant
- [ ] Test live complet sur la **J2 du NC le 2026-07-11** (valide standings + Realtime en réel ; pronos déjà saisis) — **et premier test réel du nouveau DS sur mobile**
- [ ] Renouvellement de l'abonnement odds **Highlightly Pro** (échéance ~2026-08-06) : décider avant chaque compétition (6N, RWC) ; sans lui, `/odds` répond 401 et on retombe sur le fallback ×2.0
- [ ] Réévaluer la confirmation email (désactivée) au Lot 7

## Décisions clés (actées, ne pas re-débattre)

*Détail complet dans la mémoire projet (`trycast-project-charter`). Rappel des plus structurantes :*

- **Prono unique** par (user, match), partagé entre ligues ; points rétroactifs en rejoignant.
- Saisie = **score exact** + cases bonus offensif ; points vainqueur **pondérés par les cotes** (fallback 2.0), barème versionné en DB (`scoring_rules`).
- Deadline prono au **kickoff**, imposée par **RLS serveur**.
- **Scoring 2 temps** : passe 1 immédiate sans bonus offensif, passe 2 après saisie admin des essais (aucun fournisseur ne les expose — définitif MVP).
- Logique de scoring en **module TS pur** + écriture atomique via **une seule RPC** `apply_match_scores`.
- Source de données : **Highlightly** (API-Sports, Sportradar, etc. écartés).
- **4 onglets** (Lot 5.5, remplace les 5 du Lot 5) : Matchs / Résultats / Classement / Profil — les ligues sont ventilées (CTAs sur l'accueil, bascule Ligues/Général dans Classement, gestion via le détail de ligue).
- **Auto-save optimiste du prono** (Lot 5.5, remplace le bouton Valider) : statut À pronostiquer → Enregistrement… → Enregistré dans la carte.
- Ligues : création/adhésion **uniquement par RPC** (code d'invitation jamais requêtable) ; owner supprime son compte → sa ligue disparaît en cascade (transfert = v2) ; l'owner ne quitte pas sa ligue, il la supprime.
- **i18n : FR langue source via i18next** (clés typées, namespaces par domaine), `profiles.locale` synchronisée au démarrage pour les notifications du Lot 6 ; EN livré au plus tard avant la RWC 2027.
- **Design system** : identité vert bouteille/crème/grenat (« le grenat est une étincelle, jamais un fond »), Anton + Inter, light + dark complets. Référence : `docs/design/` + skill `trycast-design-system`.

## Points ouverts / dette assumée
- App lit encore `BAREME_V1` hardcodé pour l'aperçu → **brancher l'app sur la DB avant de créer une v2** du barème.
- Override npm `react-native-css` → `lightningcss@1.30.1` (bug bundling natif) — à réévaluer quand react-native-css > 3.0.7 sort.
- La bascule de thème web repose sur le polyfill lightningcss de `light-dark()` (« space toggle » `--lightningcss-light/dark`, voir `theme-preference.ts`) — à revalider si lightningcss bouge.
- Tailwind : la palette par défaut (`bg-blue-600`…) reste techniquement disponible — la neutraliser (`--color-*: initial`) maintenant que tous les écrans sont sur les tokens.
- Identifiants encore hardcodés (signalés) : `package.json` (typegen `--project-id`), `app.json` (owner EAS, requis), migration cron `20260705000300` (URL projet).
- Base dev : 6 matchs J1 NC ont `scored_at` mais 0 prono scoré → classement général NC vide (état donnée, pas un bug).

## Journal des sessions
- **2026-07-09** — **Lot 5.5 livré (V0)**. Livrable Claude Design versionné dans `docs/design/` ; tokens Tailwind v4 light/dark (`light-dark()`), polices Anton/Inter, primitives `src/components/ui/` ; infra i18next (FR source, clés typées, migration `profiles.locale` + sync au login) ; passe écran par écran : auth unifiée (Connexion/Inscription segmentée), accueil Matchs maquette (mini-dashboard, compteur, auto-save), Résultats, Classement (bascule Ligues/Général), **navigation 4 onglets**, écrans ligue, Profil + **écran Réglages** (thème système/clair/sombre persisté, modale de suppression avec re-saisie du pseudo). Arbitrages Corentin : 4 onglets, auto-save, light+dark dès V0, Réglages minimal, blocs data reportés (live, distribution 1/N/2, stats par compétition, Match Detail — détail dans « blocs maquettés en attente de backend »). Vérifié web light+dark + login réel ; **reste à valider sur mobile à la J2**.
- **2026-07-07** — Cotes validées en réel : abonnement Highlightly Pro pris (1 mois), Corentin a vérifié que les runs de sync d'hier ont bien récupéré les odds ; pronos saisis pour la J2. Feuille de route : ajout du **Lot 5.5 (design system + i18n)** avant le push, stratégie i18n actée (FR source, `profiles.locale`, EN avant RWC).
- **2026-07-05** — Création du DASHBOARD. État : lots 0-5 livrés, Lot 6 (push) prochain.
