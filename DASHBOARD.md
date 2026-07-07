# TryCast — Dashboard

> Suivi d'avancement et décisions. Mis à jour à la fin de chaque session.
> Dernière mise à jour : **2026-07-07**

## Avancement des lots

| Lot | Sujet | État |
|-----|-------|------|
| 0-1 | Fondations, auth/profils, delete-account | ✅ Livré |
| 2 | Pipeline compétition (sync-fixtures, cron) | ✅ Livré |
| 3 | Prédictions + RLS deadline kickoff, pages Matchs/Résultats | ✅ Livré |
| 4 | Scoring (RPC `apply_match_scores`, EF `sync-results`, passes 1/2) | ✅ Livré, validé en réel J1 NC |
| 5 | Ligues & classements (standings, RPC, leaderboards, Realtime) | ✅ Livré |
| **5.5** | **Design system + i18n** (tokens Tailwind, refonte UI, i18next FR source) | 🔜 **Prochain** |
| 6 | Push (expo-notifications, tokens, notify-deadline/results, deep links, préférences) | ⬜ À venir |
| 7 | Finitions (confirmation email, EN si beta anglophone, etc.) | ⬜ À venir |

## Ce qu'il reste à faire

### Lot 5.5 — Design system + multi-langue (prochain, ~4-6 j)
Décidé le 2026-07-07 : intercalé entre ligues et push. Une seule passe écran par écran qui applique le DS **et** extrait les chaînes.

Design system (Corentin aux manettes sur l'UX, en cours de conception) :
- Tokens dans le thème Tailwind v4 (`src/tw/`) : couleurs, typo, espacements, radius
- Refonte des primitives `src/components/ui/` en variants, puis application écran par écran

i18n (infra d'abord, ~1 j — avant le Lot 6 pour que les push soient localisables) :
- `expo-localization` + i18next/react-i18next, namespaces par domaine (calqués sur `src/features/`), clés typées TS
- **FR = langue source**, extraction des chaînes en dur au fil de la refonte ; messages d'erreur des features sur les mêmes clés ; dates/nombres via `Intl`
- Colonne `locale` sur `profiles` (défaut = langue device) → consommée par `notify-deadline`/`notify-results` au Lot 6
- Mettre à jour la convention AGENTS.md (« textes UI en français » → « FR langue source via i18n, pas de chaînes en dur »)
- EN : traduction différée (avant RWC 2027, voire Lot 7 si beta anglophone) — l'infra rend ça mécanique

### Lot 6 — Push (après 5.5)
- expo-notifications + enregistrement des tokens
- Edge Functions `notify-deadline` / `notify-results` (contenus localisés via `profiles.locale`)
- Deep links vers match / ligue
- Écran de préférences de notification

### En attente côté Corentin (actions manuelles)
- [ ] Saisie admin des essais J1 (`scripts/admin-set-tries.sql`) → déclenche passe 2 auto au tick suivant
- [ ] Test live complet sur la **J2 du NC le 2026-07-11** (valide standings + Realtime en réel ; pronos déjà saisis)
- [ ] Renouvellement de l'abonnement odds **Highlightly Pro** (pris pour 1 mois vers le 2026-07-06 → échéance ~2026-08-06) : décider avant chaque compétition (6N, RWC) ; sans lui, `/odds` répond 401 et on retombe sur le fallback ×2.0
- [ ] Réévaluer la confirmation email (désactivée) au Lot 7

## Décisions clés (actées, ne pas re-débattre)

*Détail complet dans la mémoire projet (`trycast-project-charter`). Rappel des plus structurantes :*

- **Prono unique** par (user, match), partagé entre ligues ; points rétroactifs en rejoignant.
- Saisie = **score exact** + cases bonus offensif ; points vainqueur **pondérés par les cotes** (fallback 2.0), barème versionné en DB (`scoring_rules`).
- Deadline prono au **kickoff**, imposée par **RLS serveur**.
- **Scoring 2 temps** : passe 1 immédiate sans bonus offensif, passe 2 après saisie admin des essais (aucun fournisseur ne les expose — définitif MVP).
- Logique de scoring en **module TS pur** + écriture atomique via **une seule RPC** `apply_match_scores`.
- Source de données : **Highlightly** (API-Sports, Sportradar, etc. écartés).
- **5 onglets** : Matchs / Résultats / Classement / Ligues / Profil.
- Ligues : création/adhésion **uniquement par RPC** (code d'invitation jamais requêtable) ; owner supprime son compte → sa ligue disparaît en cascade (transfert = v2) ; l'owner ne quitte pas sa ligue, il la supprime.
- **i18n dès le Lot 5.5, avant les push** (décision 2026-07-07) : i18next + expo-localization, FR langue source, `profiles.locale` pour localiser les notifications ; EN livré au plus tard avant la RWC 2027.

## Points ouverts / dette assumée
- App lit encore `BAREME_V1` hardcodé pour l'aperçu → **brancher l'app sur la DB avant de créer une v2** du barème.
- Override npm `react-native-css` → `lightningcss@1.30.1` (bug bundling natif) — à réévaluer quand react-native-css > 3.0.7 sort.
- Identifiants encore hardcodés (signalés) : `package.json` (typegen `--project-id`), `app.json` (owner EAS, requis), migration cron `20260705000300` (URL projet).
- Base dev : 6 matchs J1 NC ont `scored_at` mais 0 prono scoré → classement général NC vide (état donnée, pas un bug).

## Journal des sessions
- **2026-07-07** — Cotes validées en réel : abonnement Highlightly Pro pris (1 mois), Corentin a vérifié que les runs de sync d'hier ont bien récupéré les odds ; pronos saisis pour la J2. Feuille de route : ajout du **Lot 5.5 (design system + i18n)** avant le push, stratégie i18n actée (FR source, `profiles.locale`, EN avant RWC).
- **2026-07-05** — Création du DASHBOARD. État : lots 0-5 livrés, Lot 6 (push) prochain.
