#!/usr/bin/env bash
# Vérification E2E RLS des pronostics contre le projet Supabase (Lot 3).
# Prérequis : scripts/seed-test-users.sql PUIS scripts/seed-test-predictions.sql.
# Usage : EMAIL1=... EMAIL2=... PASSWORD=... ./scripts/e2e-predictions.sh
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
ok "login des deux users"

# Matchs de test (compétition e2e-test seedée par seed-test-predictions.sql)
COMP=$(curl -s "$URL/rest/v1/competitions?slug=eq.e2e-test&select=id" \
  -H "apikey: $KEY" -H "Authorization: Bearer $T1" |
  python3 -c 'import json,sys; print(json.load(sys.stdin)[0]["id"])') || fail "compétition e2e-test introuvable (seed manquant ?)"
MATCH_FUTUR=$(curl -s "$URL/rest/v1/matches?competition_id=eq.$COMP&api_game_id=eq.-101&select=id" \
  -H "apikey: $KEY" -H "Authorization: Bearer $T1" |
  python3 -c 'import json,sys; print(json.load(sys.stdin)[0]["id"])')
MATCH_PASSE=$(curl -s "$URL/rest/v1/matches?competition_id=eq.$COMP&api_game_id=eq.-102&select=id" \
  -H "apikey: $KEY" -H "Authorization: Bearer $T1" |
  python3 -c 'import json,sys; print(json.load(sys.stdin)[0]["id"])')
ok "matchs de test trouvés"

# RLS : prono sur un match à venir autorisé (upsert = POST avec resolution=merge-duplicates,
# sur la contrainte user_id×match_id comme le fait supabase-js dans l'app)
RES=$(curl -s -X POST "$URL/rest/v1/predictions?on_conflict=user_id,match_id" \
  -H "apikey: $KEY" -H "Authorization: Bearer $T1" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation,resolution=merge-duplicates" \
  -d "{\"user_id\":\"$U1\",\"match_id\":\"$MATCH_FUTUR\",\"predicted_home_score\":24,\"predicted_away_score\":17,\"predicted_bonus_off_home\":true}")
echo "$RES" | grep -q '"predicted_home_score":24' || fail "insert prono match futur ($RES)"
ok "prono accepté avant le kickoff"

# Upsert : deuxième envoi = mise à jour, pas de doublon
RES=$(curl -s -X POST "$URL/rest/v1/predictions?on_conflict=user_id,match_id" \
  -H "apikey: $KEY" -H "Authorization: Bearer $T1" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation,resolution=merge-duplicates" \
  -d "{\"user_id\":\"$U1\",\"match_id\":\"$MATCH_FUTUR\",\"predicted_home_score\":30,\"predicted_away_score\":3}")
echo "$RES" | grep -q '"predicted_home_score":30' || fail "upsert prono ($RES)"
COUNT=$(curl -s "$URL/rest/v1/predictions?match_id=eq.$MATCH_FUTUR&select=id" \
  -H "apikey: $KEY" -H "Authorization: Bearer $T1" |
  python3 -c 'import json,sys; print(len(json.load(sys.stdin)))')
[ "$COUNT" = "1" ] || fail "upsert sans doublon (attendu 1, obtenu $COUNT)"
ok "upsert idempotent (update, pas de doublon)"

# RLS : prono sur un match au kickoff passé → 42501
RES=$(curl -s -X POST "$URL/rest/v1/predictions" \
  -H "apikey: $KEY" -H "Authorization: Bearer $T1" \
  -H "Content-Type: application/json" \
  -d "{\"user_id\":\"$U1\",\"match_id\":\"$MATCH_PASSE\",\"predicted_home_score\":10,\"predicted_away_score\":5}")
echo "$RES" | grep -q '42501' || fail "insert après kickoff (attendu 42501, obtenu $RES)"
ok "RLS bloque le prono après le kickoff"

# RLS : modification d'un prono existant après kickoff → 0 ligne touchée
RES=$(curl -s -X PATCH "$URL/rest/v1/predictions?match_id=eq.$MATCH_PASSE" \
  -H "apikey: $KEY" -H "Authorization: Bearer $T1" \
  -H "Content-Type: application/json" -H "Prefer: return=representation" \
  -d '{"predicted_home_score":50}')
[ "$RES" = "[]" ] || fail "update après kickoff (attendu [], obtenu $RES)"
ok "RLS bloque la modification après le kickoff"

# RLS : les pronos de user1 sont invisibles pour user2
RES=$(curl -s "$URL/rest/v1/predictions?select=id" -H "apikey: $KEY" -H "Authorization: Bearer $T2")
[ "$RES" = "[]" ] || fail "isolation des pronos (attendu [], obtenu $RES)"
ok "les pronos restent privés (user2 ne voit rien)"

# Grants par colonne : écrire points_awarded soi-même → 42501
RES=$(curl -s -X PATCH "$URL/rest/v1/predictions?match_id=eq.$MATCH_FUTUR" \
  -H "apikey: $KEY" -H "Authorization: Bearer $T1" \
  -H "Content-Type: application/json" \
  -d '{"points_awarded":9999}')
echo "$RES" | grep -q '42501' || fail "écriture points_awarded (attendu 42501, obtenu $RES)"
ok "les colonnes de points sont inviolables côté client"

echo
echo "Tous les tests E2E predictions sont passés."
