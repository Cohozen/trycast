# TryCast — Dashboard

> Suivi d'avancement et décisions. Mis à jour à la fin de chaque session.
> Dernière mise à jour : **2026-07-05**

## Avancement des lots

| Lot | Sujet | État |
|-----|-------|------|
| 0-1 | Fondations, auth/profils, delete-account | ✅ Livré |
| 2 | Pipeline compétition (sync-fixtures, cron) | ✅ Livré |
| 3 | Prédictions + RLS deadline kickoff, pages Matchs/Résultats | ✅ Livré |
| 4 | Scoring (RPC `apply_match_scores`, EF `sync-results`, passes 1/2) | ✅ Livré, validé en réel J1 NC |
| 5 | Ligues & classements (standings, RPC, leaderboards, Realtime) | ✅ Livré |
| **6** | **Push** (expo-notifications, tokens, notify-deadline/results, deep links, préférences) | 🔜 **Prochain** |
| 7 | Finitions (confirmation email, etc.) | ⬜ À venir |

## Ce qu'il reste à faire

### Lot 6 — Push (prochain)
- expo-notifications + enregistrement des tokens
- Edge Functions `notify-deadline` / `notify-results`
- Deep links vers match / ligue
- Écran de préférences de notification

### En attente côté Corentin (actions manuelles)
- [ ] Saisie admin des essais J1 (`scripts/admin-set-tries.sql`) → déclenche passe 2 auto au tick suivant
- [ ] Test live complet sur la **J2 du NC le 2026-07-11** (valide standings + Realtime en réel)
- [ ] Upgrade **Highlightly Pro** (5,99 $/mois) pour les cotes — en Basic `/odds` répond 401, l'aperçu tourne sur le fallback ×2.0
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

## Points ouverts / dette assumée
- App lit encore `BAREME_V1` hardcodé pour l'aperçu → **brancher l'app sur la DB avant de créer une v2** du barème.
- Override npm `react-native-css` → `lightningcss@1.30.1` (bug bundling natif) — à réévaluer quand react-native-css > 3.0.7 sort.
- Identifiants encore hardcodés (signalés) : `package.json` (typegen `--project-id`), `app.json` (owner EAS, requis), migration cron `20260705000300` (URL projet).
- Base dev : 6 matchs J1 NC ont `scored_at` mais 0 prono scoré → classement général NC vide (état donnée, pas un bug).

## Journal des sessions
- **2026-07-05** — Création du DASHBOARD. État : lots 0-5 livrés, Lot 6 (push) prochain.
