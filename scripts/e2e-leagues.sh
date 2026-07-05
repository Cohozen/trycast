#!/usr/bin/env bash
# Vérification E2E RLS des ligues contre le projet Supabase (Lot 5) :
# invisibilité pour les non-membres, anti-énumération par code, RPC
# create_league/join_league, quitter/exclure, owner verrouillé, leaderboards.
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

# Leaderboards : accès anonyme refusé
RES=$(curl -s -X POST "$URL/rest/v1/rpc/get_global_leaderboard" \
  -H "apikey: $KEY" -H "Content-Type: application/json" \
  -d "{\"p_competition_id\":\"$COMP\"}")
echo "$RES" | grep -q '42501' || fail "leaderboard anonyme (attendu 42501, obtenu $RES)"
ok "leaderboards refusés en anonyme"

echo
echo "Tous les tests E2E ligues sont passés."
