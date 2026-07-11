#!/usr/bin/env bash
# Vérification E2E RLS des notifications push (Lot 6) : tokens écrits par RPC
# uniquement (register/unregister, réaffectation entre comptes), isolation des
# tokens et préférences par user, notification_sends et RPC de sélection des
# cibles inaccessibles aux clients.
# Prérequis : scripts/seed-test-users.sql.
# Usage : EMAIL1=... EMAIL2=... PASSWORD=... ./scripts/e2e-notifications.sh
set -euo pipefail

source .env
URL="$EXPO_PUBLIC_SUPABASE_URL"
KEY="$EXPO_PUBLIC_SUPABASE_KEY"
EMAIL1="${EMAIL1:-e2e.user1@trycast.local}"
EMAIL2="${EMAIL2:-e2e.user2@trycast.local}"
PASSWORD="${PASSWORD:-motdepasse123}"
TOKEN="ExponentPushToken[e2e-notifications-device]"
# Les crochets du token doivent être encodés dans les filtres d'URL PostgREST
TOKEN_ENC=$(python3 -c 'import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1], safe=""))' "$TOKEN")

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

# RPC register_push_token : enregistrement puis rejeu idempotent
curl -s -X POST "$URL/rest/v1/rpc/register_push_token" \
  -H "apikey: $KEY" -H "Authorization: Bearer $T1" \
  -H "Content-Type: application/json" \
  -d "{\"p_token\":\"$TOKEN\",\"p_platform\":\"android\"}" > /dev/null
curl -s -X POST "$URL/rest/v1/rpc/register_push_token" \
  -H "apikey: $KEY" -H "Authorization: Bearer $T1" \
  -H "Content-Type: application/json" \
  -d "{\"p_token\":\"$TOKEN\",\"p_platform\":\"android\"}" > /dev/null
COUNT=$(curl -s "$URL/rest/v1/push_tokens?token=eq.$TOKEN_ENC&select=user_id" \
  -H "apikey: $KEY" -H "Authorization: Bearer $T1" |
  python3 -c 'import json,sys; print(len(json.load(sys.stdin)))')
[ "$COUNT" = "1" ] || fail "register idempotent (attendu 1 ligne, obtenu $COUNT)"
ok "register_push_token (rejeu idempotent, 1 ligne)"

# Isolation : user2 ne voit pas les tokens de user1
RES=$(curl -s "$URL/rest/v1/push_tokens?select=token" \
  -H "apikey: $KEY" -H "Authorization: Bearer $T2")
[ "$RES" = "[]" ] || fail "isolation tokens (attendu [], obtenu $RES)"
ok "tokens invisibles pour un autre user"

# Grants : écriture directe refusée (RPC uniquement)
RES=$(curl -s -X POST "$URL/rest/v1/push_tokens" \
  -H "apikey: $KEY" -H "Authorization: Bearer $T2" \
  -H "Content-Type: application/json" \
  -d "{\"user_id\":\"$U1\",\"token\":\"ExponentPushToken[pirate]\",\"platform\":\"android\"}")
echo "$RES" | grep -q '42501' || fail "insert direct push_tokens (attendu 42501, obtenu $RES)"
RES=$(curl -s -X DELETE "$URL/rest/v1/push_tokens?token=eq.$TOKEN_ENC" \
  -H "apikey: $KEY" -H "Authorization: Bearer $T2")
echo "$RES" | grep -q '42501' || fail "delete direct push_tokens (attendu 42501, obtenu $RES)"
ok "écriture directe de push_tokens refusée"

# Validation RPC : plateforme et token invalides → 23514
RES=$(curl -s -X POST "$URL/rest/v1/rpc/register_push_token" \
  -H "apikey: $KEY" -H "Authorization: Bearer $T1" \
  -H "Content-Type: application/json" -d "{\"p_token\":\"$TOKEN\",\"p_platform\":\"web\"}")
echo "$RES" | grep -q '23514' || fail "plateforme invalide (attendu 23514, obtenu $RES)"
RES=$(curl -s -X POST "$URL/rest/v1/rpc/register_push_token" \
  -H "apikey: $KEY" -H "Authorization: Bearer $T1" \
  -H "Content-Type: application/json" -d '{"p_token":"court","p_platform":"android"}')
echo "$RES" | grep -q '23514' || fail "token invalide (attendu 23514, obtenu $RES)"
ok "validations de la RPC (plateforme, format du token)"

# Changement de compte sur le même appareil : user2 enregistre le même token
# → la ligne est réaffectée (user1 ne la voit plus, user2 oui)
curl -s -X POST "$URL/rest/v1/rpc/register_push_token" \
  -H "apikey: $KEY" -H "Authorization: Bearer $T2" \
  -H "Content-Type: application/json" \
  -d "{\"p_token\":\"$TOKEN\",\"p_platform\":\"android\"}" > /dev/null
RES=$(curl -s "$URL/rest/v1/push_tokens?token=eq.$TOKEN_ENC&select=token" \
  -H "apikey: $KEY" -H "Authorization: Bearer $T1")
[ "$RES" = "[]" ] || fail "réaffectation : user1 voit encore le token ($RES)"
COUNT=$(curl -s "$URL/rest/v1/push_tokens?token=eq.$TOKEN_ENC&select=token" \
  -H "apikey: $KEY" -H "Authorization: Bearer $T2" |
  python3 -c 'import json,sys; print(len(json.load(sys.stdin)))')
[ "$COUNT" = "1" ] || fail "réaffectation : user2 ne voit pas le token"
ok "token réaffecté au nouveau compte du même appareil"

# unregister_push_token (déconnexion) : la ligne disparaît
curl -s -X POST "$URL/rest/v1/rpc/unregister_push_token" \
  -H "apikey: $KEY" -H "Authorization: Bearer $T2" \
  -H "Content-Type: application/json" -d "{\"p_token\":\"$TOKEN\"}" > /dev/null
RES=$(curl -s "$URL/rest/v1/push_tokens?token=eq.$TOKEN_ENC&select=token" \
  -H "apikey: $KEY" -H "Authorization: Bearer $T2")
[ "$RES" = "[]" ] || fail "unregister (attendu [], obtenu $RES)"
ok "unregister_push_token au logout"

# Préférences : upsert own (PostgREST direct), invisible pour l'autre user
RES=$(curl -s -X POST "$URL/rest/v1/notification_prefs" \
  -H "apikey: $KEY" -H "Authorization: Bearer $T1" \
  -H "Content-Type: application/json" \
  -H "Prefer: resolution=merge-duplicates,return=representation" \
  -d "{\"user_id\":\"$U1\",\"master\":true,\"reminder_enabled\":false,\"results_enabled\":true}")
echo "$RES" | grep -q '"reminder_enabled"\s*:\s*false\|"reminder_enabled": false\|"reminder_enabled":false' ||
  fail "upsert prefs user1 ($RES)"
RES=$(curl -s "$URL/rest/v1/notification_prefs?select=user_id" \
  -H "apikey: $KEY" -H "Authorization: Bearer $T2")
[ "$RES" = "[]" ] || fail "isolation prefs (attendu [], obtenu $RES)"
RES=$(curl -s -X POST "$URL/rest/v1/notification_prefs" \
  -H "apikey: $KEY" -H "Authorization: Bearer $T2" \
  -H "Content-Type: application/json" \
  -d "{\"user_id\":\"$U1\",\"master\":false,\"reminder_enabled\":false,\"results_enabled\":false}")
echo "$RES" | grep -q '42501' || fail "prefs pour autrui (attendu 42501, obtenu $RES)"
# Nettoyage : préférences de user1 remises à tout-activé
curl -s -X POST "$URL/rest/v1/notification_prefs" \
  -H "apikey: $KEY" -H "Authorization: Bearer $T1" \
  -H "Content-Type: application/json" -H "Prefer: resolution=merge-duplicates" \
  -d "{\"user_id\":\"$U1\",\"master\":true,\"reminder_enabled\":true,\"results_enabled\":true}" > /dev/null
ok "préférences : upsert own, isolées, pas d'écriture pour autrui"

# Table serveur pure : notification_sends inaccessible aux clients
RES=$(curl -s "$URL/rest/v1/notification_sends?select=id" \
  -H "apikey: $KEY" -H "Authorization: Bearer $T1")
echo "$RES" | grep -q '42501' || fail "select notification_sends (attendu 42501, obtenu $RES)"
ok "notification_sends inaccessible aux clients"

# RPC de sélection des cibles : réservées au service_role
RES=$(curl -s -X POST "$URL/rest/v1/rpc/notify_reminder_targets" \
  -H "apikey: $KEY" -H "Authorization: Bearer $T1" \
  -H "Content-Type: application/json" -d '{}')
echo "$RES" | grep -q '42501' || fail "notify_reminder_targets authenticated (attendu 42501, obtenu $RES)"
RES=$(curl -s -X POST "$URL/rest/v1/rpc/notify_result_targets" \
  -H "apikey: $KEY" -H "Authorization: Bearer $T1" \
  -H "Content-Type: application/json" -d '{}')
echo "$RES" | grep -q '42501' || fail "notify_result_targets authenticated (attendu 42501, obtenu $RES)"
ok "RPC de ciblage refusées aux clients"

# Anonyme : tout refusé
RES=$(curl -s -X POST "$URL/rest/v1/rpc/register_push_token" \
  -H "apikey: $KEY" -H "Content-Type: application/json" \
  -d "{\"p_token\":\"$TOKEN\",\"p_platform\":\"android\"}")
echo "$RES" | grep -q '42501' || fail "register anonyme (attendu 42501, obtenu $RES)"
RES=$(curl -s "$URL/rest/v1/push_tokens?select=token" -H "apikey: $KEY")
echo "$RES" | grep -q '42501' || fail "select tokens anonyme (attendu 42501, obtenu $RES)"
ok "tout refusé en anonyme"

echo
echo "Tous les tests E2E notifications sont passés."
