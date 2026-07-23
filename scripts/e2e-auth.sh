#!/usr/bin/env bash
# Vérification E2E auth/profils contre le projet Supabase (Lot 1).
# Prérequis : deux utilisateurs de test confirmés (voir scripts/seed-test-users.sql)
# Usage : EMAIL1=... EMAIL2=... PASSWORD=... ./scripts/e2e-auth.sh
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

# RLS : select autorisé pour un utilisateur connecté
COUNT=$(curl -s "$URL/rest/v1/profiles?select=id" -H "apikey: $KEY" -H "Authorization: Bearer $T1" |
  python3 -c 'import json,sys; print(len(json.load(sys.stdin)))')
[ "$COUNT" -ge 2 ] || fail "select profiles (attendu >= 2, obtenu $COUNT)"
ok "select profiles authentifié"

# RLS : update de son propre profil autorisé
RES=$(curl -s -X PATCH "$URL/rest/v1/profiles?id=eq.$U1" \
  -H "apikey: $KEY" -H "Authorization: Bearer $T1" \
  -H "Content-Type: application/json" -H "Prefer: return=representation" \
  -d '{"username":"E2eRenamed1"}')
echo "$RES" | grep -q 'E2eRenamed1' || fail "update de son propre username"
ok "update de son propre username"

# RLS : update du profil d'un autre → 0 ligne
RES=$(curl -s -X PATCH "$URL/rest/v1/profiles?id=eq.$U2" \
  -H "apikey: $KEY" -H "Authorization: Bearer $T1" \
  -H "Content-Type: application/json" -H "Prefer: return=representation" \
  -d '{"username":"Pirate"}')
[ "$RES" = "[]" ] || fail "RLS update du profil d'autrui (attendu [], obtenu $RES)"
ok "RLS bloque l'update du profil d'autrui"

# RLS : insert anonyme refusé
RES=$(curl -s -X POST "$URL/rest/v1/profiles" -H "apikey: $KEY" \
  -H "Content-Type: application/json" -d "{\"id\":\"$U1\",\"username\":\"Hack\"}")
echo "$RES" | grep -q '42501' || fail "insert anonyme (attendu 42501)"
ok "RLS bloque l'insert direct"

# Contrainte : username invalide refusé
RES=$(curl -s -X PATCH "$URL/rest/v1/profiles?id=eq.$U1" \
  -H "apikey: $KEY" -H "Authorization: Bearer $T1" \
  -H "Content-Type: application/json" -d '{"username":"ab"}')
echo "$RES" | grep -q '23514' || fail "check constraint username_format"
ok "check constraint username_format"

# RPC : disponibilité du pseudo (insensible à la casse)
RES=$(curl -s -X POST "$URL/rest/v1/rpc/username_available" -H "apikey: $KEY" \
  -H "Content-Type: application/json" -d '{"candidate":"e2erenamed1"}')
[ "$RES" = "false" ] || fail "username_available pseudo pris (attendu false)"
ok "username_available (pris, insensible à la casse)"

# RPC claim_username (revendication du pseudo à la première connexion OAuth).
# Le cas « username_chosen à false » vient d'un compte créé sans pseudo dans
# raw_user_meta_data : il n'est reproductible qu'avec un vrai parcours
# fournisseur, donc vérifié sur device et non ici.
RES=$(curl -s -X POST "$URL/rest/v1/rpc/claim_username" -H "apikey: $KEY" \
  -H "Content-Type: application/json" -d '{"candidate":"Anonyme1"}')
echo "$RES" | grep -q '42501' || fail "claim_username anonyme (attendu 42501, obtenu $RES)"
ok "claim_username refuse les appels non authentifiés"

RES=$(curl -s -X POST "$URL/rest/v1/rpc/claim_username" -H "apikey: $KEY" \
  -H "Authorization: Bearer $T1" -H "Content-Type: application/json" \
  -d '{"candidate":"E2eClaimed1"}')
echo "$RES" | grep -q '"username":"E2eClaimed1"' || fail "claim_username pseudo libre ($RES)"
echo "$RES" | grep -q '"username_chosen":true' || fail "claim_username n'a pas marqué le pseudo comme choisi ($RES)"
ok "claim_username écrit le pseudo et le marque comme choisi"

# Le pseudo de user2, pour tester le conflit d'unicité
TAKEN=$(curl -s "$URL/rest/v1/profiles?id=eq.$U2&select=username" \
  -H "apikey: $KEY" -H "Authorization: Bearer $T1" |
  python3 -c 'import json,sys; print(json.load(sys.stdin)[0]["username"])')
RES=$(curl -s -X POST "$URL/rest/v1/rpc/claim_username" -H "apikey: $KEY" \
  -H "Authorization: Bearer $T1" -H "Content-Type: application/json" \
  -d "{\"candidate\":\"$TAKEN\"}")
echo "$RES" | grep -q '23505' || fail "claim_username pseudo pris (attendu 23505, obtenu $RES)"
ok "claim_username refuse un pseudo déjà pris"

RES=$(curl -s -X POST "$URL/rest/v1/rpc/claim_username" -H "apikey: $KEY" \
  -H "Authorization: Bearer $T1" -H "Content-Type: application/json" -d '{"candidate":"ab"}')
echo "$RES" | grep -q '23514' || fail "claim_username format invalide (attendu 23514, obtenu $RES)"
ok "claim_username refuse un pseudo mal formé"

# Volontairement rejouable : un ré-appui après un aléa réseau ne doit pas échouer
RES=$(curl -s -X POST "$URL/rest/v1/rpc/claim_username" -H "apikey: $KEY" \
  -H "Authorization: Bearer $T1" -H "Content-Type: application/json" \
  -d '{"candidate":"E2eRenamed1"}')
echo "$RES" | grep -q '"username":"E2eRenamed1"' || fail "claim_username rejouable ($RES)"
ok "claim_username est rejouable"

# Edge Function : suppression sans token refusée
CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$URL/functions/v1/delete-account" -H "apikey: $KEY")
[ "$CODE" = "401" ] || fail "delete-account sans token (attendu 401, obtenu $CODE)"
ok "delete-account refuse les appels non authentifiés"

# Edge Function : suppression du compte user2
RES=$(curl -s -X POST "$URL/functions/v1/delete-account" -H "apikey: $KEY" -H "Authorization: Bearer $T2")
echo "$RES" | grep -q 'success' || fail "delete-account user2 ($RES)"
ok "delete-account supprime le compte"

echo
echo "Tous les tests E2E sont passés. Pense à re-seeder les users de test (user2 supprimé)."
