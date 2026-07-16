#!/usr/bin/env bash
# Vérification E2E RLS des ligues contre le projet Supabase (Lot 5 + pages
# ligues 2026-07-16) : invisibilité pour les non-membres, anti-énumération par
# code, RPC create_league/join_league, quitter/exclure, owner verrouillé,
# leaderboards, couleur de ligue, preview_league, transfert de propriété.
# Le plafond de 50 membres (P0003) n'est pas couvert ici — il faudrait 50
# comptes auth ; garanti par le verrou de join_league, testable en SQL.
# Prérequis : scripts/seed-test-users.sql PUIS scripts/seed-test-predictions.sql
# PUIS scripts/seed-test-leagues.sql.
# Usage : EMAIL1=... EMAIL2=... PASSWORD=... ./scripts/e2e-leagues.sh
set -euo pipefail

source .env
URL="$EXPO_PUBLIC_SUPABASE_URL"
KEY="$EXPO_PUBLIC_SUPABASE_KEY"
EMAIL1="${EMAIL1:-e2e.user1@trycast.local}"
EMAIL2="${EMAIL2:-e2e.user2@trycast.local}"
PASSWORD="${PASSWORD:-motdepasse123}"

login() {
  curl -s -X POST "$URL/auth/v1/token?grant_type=password" \
    -H "apikey: $KEY" -H "Content-Type: application/json" \
    -d "{\"email\":\"$1\",\"password\":\"$PASSWORD\"}"
}

fail() { echo "❌ $1"; exit 1; }
ok() { echo "✅ $1"; }

S1=$(login "$EMAIL1")
S2=$(login "$EMAIL2")
T1=$(echo "$S1" | python3 -c 'import json,sys; print(json.load(sys.stdin)["access_token"])') || fail "login user1"
T2=$(echo "$S2" | python3 -c 'import json,sys; print(json.load(sys.stdin)["access_token"])') || fail "login user2"
U1=$(echo "$S1" | python3 -c 'import json,sys; print(json.load(sys.stdin)["user"]["id"])')
U2=$(echo "$S2" | python3 -c 'import json,sys; print(json.load(sys.stdin)["user"]["id"])')
ok "login des deux users"

# La ligue seedée, vue par son owner
LID=$(curl -s "$URL/rest/v1/leagues?invite_code=eq.E2ETEST2&select=id" \
  -H "apikey: $KEY" -H "Authorization: Bearer $T1" |
  python3 -c 'import json,sys; print(json.load(sys.stdin)[0]["id"])') ||
  fail "ligue E2ETEST2 introuvable pour user1 (seed manquant ?)"
COMP=$(curl -s "$URL/rest/v1/competitions?slug=eq.e2e-test&select=id" \
  -H "apikey: $KEY" -H "Authorization: Bearer $T1" |
  python3 -c 'import json,sys; print(json.load(sys.stdin)[0]["id"])')
# Les deux matchs seedés (seed-test-predictions.sql) : passé = pronos visibles,
# futur = masqués par la RPC get_match_league_predictions
M_PASSE=$(curl -s "$URL/rest/v1/matches?api_game_id=eq.-102&select=id" \
  -H "apikey: $KEY" -H "Authorization: Bearer $T1" |
  python3 -c 'import json,sys; print(json.load(sys.stdin)[0]["id"])') ||
  fail "match passé -102 introuvable (seed predictions manquant ?)"
M_FUTUR=$(curl -s "$URL/rest/v1/matches?api_game_id=eq.-101&select=id" \
  -H "apikey: $KEY" -H "Authorization: Bearer $T1" |
  python3 -c 'import json,sys; print(json.load(sys.stdin)[0]["id"])')
ok "ligue de test visible par son owner"

# RLS : un non-membre ne voit aucune ligue…
RES=$(curl -s "$URL/rest/v1/leagues?select=id" \
  -H "apikey: $KEY" -H "Authorization: Bearer $T2")
[ "$RES" = "[]" ] || fail "isolation ligues (attendu [], obtenu $RES)"
# … même en connaissant le code (pas d'énumération par select)
RES=$(curl -s "$URL/rest/v1/leagues?invite_code=eq.E2ETEST2&select=id" \
  -H "apikey: $KEY" -H "Authorization: Bearer $T2")
[ "$RES" = "[]" ] || fail "anti-énumération par code (attendu [], obtenu $RES)"
ok "ligue invisible pour un non-membre, même par code"

# Pronos de ligue : un non-membre n'obtient rien, même sur un match passé
# (anti-énumération silencieuse, comme le leaderboard)
RES=$(curl -s -X POST "$URL/rest/v1/rpc/get_match_league_predictions" \
  -H "apikey: $KEY" -H "Authorization: Bearer $T2" \
  -H "Content-Type: application/json" \
  -d "{\"p_match_id\":\"$M_PASSE\",\"p_league_id\":\"$LID\"}")
[ "$RES" = "[]" ] || fail "pronos de ligue pour un non-membre (attendu [], obtenu $RES)"
ok "pronos de ligue invisibles pour un non-membre"

# Grants : insert direct refusé (création/adhésion = RPC uniquement)
RES=$(curl -s -X POST "$URL/rest/v1/leagues" \
  -H "apikey: $KEY" -H "Authorization: Bearer $T2" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Pirate\",\"invite_code\":\"AAAAAAAA\",\"owner_id\":\"$U2\",\"competition_id\":\"$COMP\"}")
echo "$RES" | grep -q '42501' || fail "insert direct leagues (attendu 42501, obtenu $RES)"
RES=$(curl -s -X POST "$URL/rest/v1/league_members" \
  -H "apikey: $KEY" -H "Authorization: Bearer $T2" \
  -H "Content-Type: application/json" \
  -d "{\"league_id\":\"$LID\",\"user_id\":\"$U2\"}")
echo "$RES" | grep -q '42501' || fail "insert direct league_members (attendu 42501, obtenu $RES)"
ok "inserts directs refusés (RPC uniquement)"

# RPC join_league : code bidon → P0002, message FR
RES=$(curl -s -X POST "$URL/rest/v1/rpc/join_league" \
  -H "apikey: $KEY" -H "Authorization: Bearer $T2" \
  -H "Content-Type: application/json" -d '{"p_code":"XXXXXXXX"}')
echo "$RES" | grep -q 'P0002' || fail "join code bidon (attendu P0002, obtenu $RES)"
ok "join refusé sur code invalide"

# RPC join_league : adhésion (avec code en minuscules/espaces → normalisé serveur)
RES=$(curl -s -X POST "$URL/rest/v1/rpc/join_league" \
  -H "apikey: $KEY" -H "Authorization: Bearer $T2" \
  -H "Content-Type: application/json" -d '{"p_code":" e2etest2 "}')
echo "$RES" | grep -q '"invite_code" : "E2ETEST2"\|"invite_code":"E2ETEST2"' ||
  fail "join E2ETEST2 ($RES)"
# Rejouer : idempotent, pas de doublon
curl -s -X POST "$URL/rest/v1/rpc/join_league" \
  -H "apikey: $KEY" -H "Authorization: Bearer $T2" \
  -H "Content-Type: application/json" -d '{"p_code":"E2ETEST2"}' > /dev/null
COUNT=$(curl -s "$URL/rest/v1/league_members?league_id=eq.$LID&select=user_id" \
  -H "apikey: $KEY" -H "Authorization: Bearer $T2" |
  python3 -c 'import json,sys; print(len(json.load(sys.stdin)))')
[ "$COUNT" = "2" ] || fail "join idempotent (attendu 2 membres, obtenu $COUNT)"
ok "join par RPC (normalisation du code, rejeu idempotent, 2 membres)"

# Membre : la ligue et le classement de ligue sont maintenant visibles
RES=$(curl -s "$URL/rest/v1/leagues?select=name" \
  -H "apikey: $KEY" -H "Authorization: Bearer $T2")
echo "$RES" | grep -q 'Ligue E2E' || fail "ligue visible après join ($RES)"
COUNT=$(curl -s -X POST "$URL/rest/v1/rpc/get_league_leaderboard" \
  -H "apikey: $KEY" -H "Authorization: Bearer $T2" \
  -H "Content-Type: application/json" -d "{\"p_league_id\":\"$LID\"}" |
  python3 -c 'import json,sys; print(len(json.load(sys.stdin)))')
[ "$COUNT" = "2" ] || fail "leaderboard ligue (attendu 2 rows, obtenu $COUNT)"
ok "ligue et classement de ligue visibles pour le nouveau membre"

# Pronos de ligue, match passé : user2 (membre) voit le prono 10-5 de user1
# ET sa propre ligne sans prono (left join → champs null, décision 2026-07-13)
RES=$(curl -s -X POST "$URL/rest/v1/rpc/get_match_league_predictions" \
  -H "apikey: $KEY" -H "Authorization: Bearer $T2" \
  -H "Content-Type: application/json" \
  -d "{\"p_match_id\":\"$M_PASSE\",\"p_league_id\":\"$LID\"}")
echo "$RES" | python3 -c "
import json, sys
rows = json.load(sys.stdin)
assert len(rows) == 2, f'attendu 2 lignes (membres), obtenu {len(rows)}'
by_user = {r['user_id']: r for r in rows}
u1, u2 = by_user['$U1'], by_user['$U2']
assert (u1['predicted_home_score'], u1['predicted_away_score']) == (10, 5), u1
assert u2['predicted_home_score'] is None, u2
" || fail "pronos de ligue après kickoff ($RES)"
ok "pronos de ligue visibles après kickoff (prono de user1 + ligne vide de user2)"

# Match futur : user1 pose un prono (autorisé avant kickoff), la RPC ne doit
# RIEN renvoyer avant le coup d'envoi — pas même des lignes masquées
curl -s -X POST "$URL/rest/v1/predictions" \
  -H "apikey: $KEY" -H "Authorization: Bearer $T1" \
  -H "Content-Type: application/json" \
  -H "Prefer: resolution=merge-duplicates" \
  -d "{\"user_id\":\"$U1\",\"match_id\":\"$M_FUTUR\",\"predicted_home_score\":21,\"predicted_away_score\":14}" > /dev/null
RES=$(curl -s -X POST "$URL/rest/v1/rpc/get_match_league_predictions" \
  -H "apikey: $KEY" -H "Authorization: Bearer $T2" \
  -H "Content-Type: application/json" \
  -d "{\"p_match_id\":\"$M_FUTUR\",\"p_league_id\":\"$LID\"}")
[ "$RES" = "[]" ] || fail "masquage avant kickoff (attendu [], obtenu $RES)"
ok "pronos de ligue masqués avant le kickoff"

# RPC create_league : code généré conforme ; nom invalide → 23514
RES=$(curl -s -X POST "$URL/rest/v1/rpc/create_league" \
  -H "apikey: $KEY" -H "Authorization: Bearer $T1" \
  -H "Content-Type: application/json" -d '{"p_name":"Ligue Smoke E2E"}')
LID2=$(echo "$RES" | python3 -c 'import json,sys; print(json.load(sys.stdin)["id"])') ||
  fail "create_league ($RES)"
echo "$RES" | python3 -c '
import json, re, sys
code = json.load(sys.stdin)["invite_code"]
sys.exit(0 if re.fullmatch(r"[A-HJ-KM-NP-Z2-9]{8}", code) else 1)' ||
  fail "format du code généré ($RES)"
RES=$(curl -s -X POST "$URL/rest/v1/rpc/create_league" \
  -H "apikey: $KEY" -H "Authorization: Bearer $T1" \
  -H "Content-Type: application/json" -d '{"p_name":"ab"}')
echo "$RES" | grep -q '23514' || fail "nom trop court (attendu 23514, obtenu $RES)"
ok "create_league : code serveur conforme, nom invalide refusé"

# Quitter : user2 supprime sa propre membership
RES=$(curl -s -X DELETE "$URL/rest/v1/league_members?league_id=eq.$LID&user_id=eq.$U2" \
  -H "apikey: $KEY" -H "Authorization: Bearer $T2" -H "Prefer: return=representation")
echo "$RES" | grep -q "$U2" || fail "quitter la ligue ($RES)"
RES=$(curl -s "$URL/rest/v1/leagues?select=id" \
  -H "apikey: $KEY" -H "Authorization: Bearer $T2")
[ "$RES" = "[]" ] || fail "ligue encore visible après départ ($RES)"
ok "quitter la ligue (membership supprimée, ligue invisible à nouveau)"

# Exclure : re-join puis kick par l'owner
curl -s -X POST "$URL/rest/v1/rpc/join_league" \
  -H "apikey: $KEY" -H "Authorization: Bearer $T2" \
  -H "Content-Type: application/json" -d '{"p_code":"E2ETEST2"}' > /dev/null
RES=$(curl -s -X DELETE "$URL/rest/v1/league_members?league_id=eq.$LID&user_id=eq.$U2" \
  -H "apikey: $KEY" -H "Authorization: Bearer $T1" -H "Prefer: return=representation")
echo "$RES" | grep -q "$U2" || fail "kick par l'owner ($RES)"
ok "exclusion d'un membre par l'owner"

# Owner verrouillé : ni self-leave ni kick par un tiers, ni delete de la ligue
RES=$(curl -s -X DELETE "$URL/rest/v1/league_members?league_id=eq.$LID&user_id=eq.$U1" \
  -H "apikey: $KEY" -H "Authorization: Bearer $T1" -H "Prefer: return=representation")
[ "$RES" = "[]" ] || fail "self-leave owner (attendu [], obtenu $RES)"
RES=$(curl -s -X DELETE "$URL/rest/v1/league_members?league_id=eq.$LID&user_id=eq.$U1" \
  -H "apikey: $KEY" -H "Authorization: Bearer $T2" -H "Prefer: return=representation")
[ "$RES" = "[]" ] || fail "kick de l'owner par user2 (attendu [], obtenu $RES)"
RES=$(curl -s -X DELETE "$URL/rest/v1/leagues?id=eq.$LID" \
  -H "apikey: $KEY" -H "Authorization: Bearer $T2" -H "Prefer: return=representation")
[ "$RES" = "[]" ] || fail "delete ligue par non-owner (attendu [], obtenu $RES)"
ok "owner verrouillé (pas de self-leave, kick et delete réservés)"

# Suppression par l'owner : la ligue créée par la RPC, cascade des memberships
RES=$(curl -s -X DELETE "$URL/rest/v1/leagues?id=eq.$LID2" \
  -H "apikey: $KEY" -H "Authorization: Bearer $T1" -H "Prefer: return=representation")
echo "$RES" | grep -q "$LID2" || fail "delete ligue par l'owner ($RES)"
ok "suppression de sa ligue par l'owner"

# Pages ligues : couleur à la création (défaut + explicite + hors palette)
RES=$(curl -s -X POST "$URL/rest/v1/rpc/create_league" \
  -H "apikey: $KEY" -H "Authorization: Bearer $T1" \
  -H "Content-Type: application/json" \
  -d '{"p_name":"Ligue Pages E2E","p_color":"#E0952A"}')
LID3=$(echo "$RES" | python3 -c 'import json,sys; print(json.load(sys.stdin)["id"])') ||
  fail "create_league avec couleur ($RES)"
CODE3=$(echo "$RES" | python3 -c 'import json,sys; print(json.load(sys.stdin)["invite_code"])')
echo "$RES" | grep -q '#E0952A' || fail "couleur non persistée ($RES)"
RES=$(curl -s -X POST "$URL/rest/v1/rpc/create_league" \
  -H "apikey: $KEY" -H "Authorization: Bearer $T1" \
  -H "Content-Type: application/json" \
  -d '{"p_name":"Ligue Pirate","p_color":"#FF0000"}')
echo "$RES" | grep -q '23514' || fail "couleur hors palette (attendu 23514, obtenu $RES)"
ok "create_league : couleur persistée, palette fermée"

# Transfert vers un non-membre : refusé avant que user2 ne rejoigne
RES=$(curl -s -X POST "$URL/rest/v1/rpc/transfer_league_ownership" \
  -H "apikey: $KEY" -H "Authorization: Bearer $T1" \
  -H "Content-Type: application/json" \
  -d "{\"p_league_id\":\"$LID3\",\"p_new_owner_id\":\"$U2\"}")
echo "$RES" | grep -q 'P0002' || fail "transfert vers non-membre (attendu P0002, obtenu $RES)"
ok "transfert vers un non-membre refusé"

# preview_league : identité sans adhésion (code normalisé), code bidon → P0002
RES=$(curl -s -X POST "$URL/rest/v1/rpc/preview_league" \
  -H "apikey: $KEY" -H "Authorization: Bearer $T2" \
  -H "Content-Type: application/json" \
  -d "{\"p_code\":\" $(echo "$CODE3" | tr '[:upper:]' '[:lower:]') \"}")
echo "$RES" | python3 -c "
import json, sys
row = json.load(sys.stdin)[0]
assert row['name'] == 'Ligue Pages E2E', row
assert row['color'] == '#E0952A', row
assert row['member_count'] == 1, row
assert row['is_member'] is False, row
assert row['is_full'] is False, row
" || fail "preview_league non-membre ($RES)"
RES=$(curl -s -X POST "$URL/rest/v1/rpc/preview_league" \
  -H "apikey: $KEY" -H "Authorization: Bearer $T2" \
  -H "Content-Type: application/json" -d '{"p_code":"XXXXXXXX"}')
echo "$RES" | grep -q 'P0002' || fail "preview code bidon (attendu P0002, obtenu $RES)"
ok "preview_league : aperçu sans adhésion, code bidon refusé"

# user2 rejoint → preview le voit membre
curl -s -X POST "$URL/rest/v1/rpc/join_league" \
  -H "apikey: $KEY" -H "Authorization: Bearer $T2" \
  -H "Content-Type: application/json" -d "{\"p_code\":\"$CODE3\"}" > /dev/null
RES=$(curl -s -X POST "$URL/rest/v1/rpc/preview_league" \
  -H "apikey: $KEY" -H "Authorization: Bearer $T2" \
  -H "Content-Type: application/json" -d "{\"p_code\":\"$CODE3\"}")
echo "$RES" | python3 -c "
import json, sys
row = json.load(sys.stdin)[0]
assert row['is_member'] is True, row
assert row['member_count'] == 2, row
" || fail "preview_league membre ($RES)"
ok "preview_league reflète l'adhésion"

# Transfert : refusé pour un simple membre, refusé vers soi-même, puis effectif
RES=$(curl -s -X POST "$URL/rest/v1/rpc/transfer_league_ownership" \
  -H "apikey: $KEY" -H "Authorization: Bearer $T2" \
  -H "Content-Type: application/json" \
  -d "{\"p_league_id\":\"$LID3\",\"p_new_owner_id\":\"$U2\"}")
echo "$RES" | grep -q '42501' || fail "transfert par un membre (attendu 42501, obtenu $RES)"
RES=$(curl -s -X POST "$URL/rest/v1/rpc/transfer_league_ownership" \
  -H "apikey: $KEY" -H "Authorization: Bearer $T1" \
  -H "Content-Type: application/json" \
  -d "{\"p_league_id\":\"$LID3\",\"p_new_owner_id\":\"$U1\"}")
echo "$RES" | grep -q '23514' || fail "transfert vers soi-même (attendu 23514, obtenu $RES)"
RES=$(curl -s -X POST "$URL/rest/v1/rpc/transfer_league_ownership" \
  -H "apikey: $KEY" -H "Authorization: Bearer $T1" \
  -H "Content-Type: application/json" \
  -d "{\"p_league_id\":\"$LID3\",\"p_new_owner_id\":\"$U2\"}")
echo "$RES" | python3 -c "
import json, sys
row = json.load(sys.stdin)
row = row[0] if isinstance(row, list) else row
assert row['owner_id'] == '$U2', row
" || fail "transfert effectif ($RES)"
RES=$(curl -s "$URL/rest/v1/league_members?league_id=eq.$LID3&select=user_id,role" \
  -H "apikey: $KEY" -H "Authorization: Bearer $T2")
echo "$RES" | python3 -c "
import json, sys
roles = {r['user_id']: r['role'] for r in json.load(sys.stdin)}
assert roles['$U1'] == 'member', roles
assert roles['$U2'] == 'owner', roles
" || fail "rôles après transfert ($RES)"
ok "transfert de propriété (membre refusé, soi-même refusé, swap owner/rôles)"

# L'ex-owner est un membre comme un autre : il peut quitter, puis le nouvel
# owner supprime la ligue (nettoyage)
RES=$(curl -s -X DELETE "$URL/rest/v1/league_members?league_id=eq.$LID3&user_id=eq.$U1" \
  -H "apikey: $KEY" -H "Authorization: Bearer $T1" -H "Prefer: return=representation")
echo "$RES" | grep -q "$U1" || fail "self-leave de l'ex-owner ($RES)"
RES=$(curl -s -X DELETE "$URL/rest/v1/leagues?id=eq.$LID3" \
  -H "apikey: $KEY" -H "Authorization: Bearer $T2" -H "Prefer: return=representation")
echo "$RES" | grep -q "$LID3" || fail "delete par le nouvel owner ($RES)"
ok "ex-owner libéré, suppression par le nouvel owner"

# get_league_round_points : non-membre → 0 ligne ; membre → agrégat par journée
RES=$(curl -s -X POST "$URL/rest/v1/rpc/get_league_round_points" \
  -H "apikey: $KEY" -H "Authorization: Bearer $T2" \
  -H "Content-Type: application/json" -d "{\"p_league_id\":\"$LID\"}")
[ "$RES" = "[]" ] || fail "round points pour un non-membre (attendu [], obtenu $RES)"
RES=$(curl -s -X POST "$URL/rest/v1/rpc/get_league_round_points" \
  -H "apikey: $KEY" -H "Authorization: Bearer $T1" \
  -H "Content-Type: application/json" -d "{\"p_league_id\":\"$LID\"}")
# À ce stade user2 a été exclu : 1 membre × 1 journée entamée (E2E, match -102
# terminé 10-5 par le seed = score exact du prono de user1, 8 pts seedés)
echo "$RES" | python3 -c "
import json, sys
rows = json.load(sys.stdin)
assert len(rows) == 1, f'attendu 1 ligne (1 membre, 1 journée), obtenu {len(rows)}'
row = rows[0]
assert row['round'] == 'E2E', row
assert row['user_id'] == '$U1', row
assert row['points'] == 8, row
assert row['exact_scores'] == 1, row
" || fail "round points pour l'owner ($RES)"
ok "round points : 0 ligne hors ligue, agrégat exact par journée pour un membre"

# Leaderboards : accès anonyme refusé
RES=$(curl -s -X POST "$URL/rest/v1/rpc/get_global_leaderboard" \
  -H "apikey: $KEY" -H "Content-Type: application/json" \
  -d "{\"p_competition_id\":\"$COMP\"}")
echo "$RES" | grep -q '42501' || fail "leaderboard anonyme (attendu 42501, obtenu $RES)"
RES=$(curl -s -X POST "$URL/rest/v1/rpc/get_match_league_predictions" \
  -H "apikey: $KEY" -H "Content-Type: application/json" \
  -d "{\"p_match_id\":\"$M_PASSE\",\"p_league_id\":\"$LID\"}")
echo "$RES" | grep -q '42501' || fail "pronos de ligue anonyme (attendu 42501, obtenu $RES)"
RES=$(curl -s -X POST "$URL/rest/v1/rpc/preview_league" \
  -H "apikey: $KEY" -H "Content-Type: application/json" \
  -d '{"p_code":"E2ETEST2"}')
echo "$RES" | grep -q '42501' || fail "preview anonyme (attendu 42501, obtenu $RES)"
ok "leaderboards, pronos de ligue et preview refusés en anonyme"

echo
echo "Tous les tests E2E ligues sont passés."
