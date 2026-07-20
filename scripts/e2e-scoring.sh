#!/usr/bin/env bash
# Vérification E2E côté client du scoring (Lot 4) : barème lisible mais
# inviolable, RPC apply_match_scores verrouillée (service_role uniquement).
# Le comportement de la RPC elle-même (idempotence, passes 1/2) est vérifié
# côté serveur par scripts/e2e-scoring.sql.
# Prérequis : scripts/seed-test-users.sql.
# Usage : EMAIL1=... PASSWORD=... ./scripts/e2e-scoring.sh
set -euo pipefail

source .env
URL="$EXPO_PUBLIC_SUPABASE_URL"
KEY="$EXPO_PUBLIC_SUPABASE_KEY"
EMAIL1="${EMAIL1:-e2e.user1@trycast.local}"
PASSWORD="${PASSWORD:-motdepasse123}"

fail() { echo "❌ $1"; exit 1; }
ok() { echo "✅ $1"; }

T1=$(curl -s -X POST "$URL/auth/v1/token?grant_type=password" \
  -H "apikey: $KEY" -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL1\",\"password\":\"$PASSWORD\"}" |
  python3 -c 'import json,sys; print(json.load(sys.stdin)["access_token"])') || fail "login user1"
ok "login user1"

# Barème actif lisible par un client authentifié, valeurs du seed v2 en place
# (garde-fou de divergence avec BAREME_V2 côté app / hook useActiveScoringRules)
RES=$(curl -s "$URL/rest/v1/scoring_rules?is_active=eq.true&select=version,rules" \
  -H "apikey: $KEY" -H "Authorization: Bearer $T1")
echo "$RES" | python3 -c '
import json, sys
rows = json.load(sys.stdin)
assert len(rows) == 1, f"1 barème actif attendu, {len(rows)} reçu(s)"
rules = rows[0]["rules"]
assert rows[0]["version"] == 2 and rules["version"] == 2
assert rules["winnerPointsPerOddsUnit"] == 15 and rules["fallbackOdds"] == 2.0
assert rules["exactScoreBonus"] == 50 and rules["offensiveBonusRatio"] == 0.25
assert rules["offensiveMalusPoints"] == 10
' || fail "lecture du barème actif ($RES)"
ok "barème v2 actif lisible, valeurs conformes"

# Écriture du barème par un client → 42501 (grants)
RES=$(curl -s -X POST "$URL/rest/v1/scoring_rules" \
  -H "apikey: $KEY" -H "Authorization: Bearer $T1" \
  -H "Content-Type: application/json" \
  -d '{"version":99,"rules":{"version":99},"is_active":false}')
echo "$RES" | grep -q '42501' || fail "insert scoring_rules (attendu 42501, obtenu $RES)"
ok "le barème est inviolable côté client"

# RPC de scoring par un client authentifié → 42501 (execute service_role only)
RES=$(curl -s -X POST "$URL/rest/v1/rpc/apply_match_scores" \
  -H "apikey: $KEY" -H "Authorization: Bearer $T1" \
  -H "Content-Type: application/json" \
  -d '{"p_match_id":"00000000-0000-0000-0000-000000000000","p_rule_version":1,"p_predictions":[]}')
echo "$RES" | grep -q '42501' || fail "rpc apply_match_scores (attendu 42501, obtenu $RES)"
ok "la RPC apply_match_scores est verrouillée (service_role uniquement)"

# Accès anonyme au barème → refusé (aucun grant anon)
RES=$(curl -s "$URL/rest/v1/scoring_rules?select=version" -H "apikey: $KEY")
echo "$RES" | grep -q '42501' || fail "accès anonyme scoring_rules (attendu 42501, obtenu $RES)"
ok "aucun accès anonyme au barème"

echo
echo "Tous les tests E2E scoring sont passés."
