#!/usr/bin/env bash
# Vérification E2E de la photo de profil (Bloc « photo de profil ») contre le
# projet Supabase : policies Storage « son propre dossier », colonne
# profiles.avatar_url (grant par colonne + lecture par autrui), et présence de
# avatar_url dans le retour des classements.
# Prérequis : deux utilisateurs de test confirmés (scripts/seed-test-users.sql).
# Usage : EMAIL1=... EMAIL2=... PASSWORD=... ./scripts/e2e-avatars.sh
set -euo pipefail

source .env
URL="$EXPO_PUBLIC_SUPABASE_URL"
KEY="$EXPO_PUBLIC_SUPABASE_KEY"
EMAIL1="${EMAIL1:-e2e.user1@trycast.local}"
EMAIL2="${EMAIL2:-e2e.user2@trycast.local}"
PASSWORD="${PASSWORD:-motdepasse123}"
BUCKET="avatars"

login() {
  curl -s -X POST "$URL/auth/v1/token?grant_type=password" \
    -H "apikey: $KEY" -H "Content-Type: application/json" \
    -d "{\"email\":\"$1\",\"password\":\"$PASSWORD\"}"
}
jqpy() { python3 -c "import json,sys; d=json.load(sys.stdin); print($1)"; }
fail() { echo "❌ $1"; exit 1; }
ok() { echo "✅ $1"; }

S1=$(login "$EMAIL1")
S2=$(login "$EMAIL2")
T1=$(echo "$S1" | jqpy 'd["access_token"]') || fail "login user1"
T2=$(echo "$S2" | jqpy 'd["access_token"]') || fail "login user2"
U1=$(echo "$S1" | jqpy 'd["user"]["id"]')
U2=$(echo "$S2" | jqpy 'd["user"]["id"]')
ok "login des deux users"

# --- Storage : upload dans son propre dossier autorisé ---
CODE=$(curl -s -o /dev/null -w '%{http_code}' -X POST \
  "$URL/storage/v1/object/$BUCKET/$U1/avatar.jpg" \
  -H "apikey: $KEY" -H "Authorization: Bearer $T1" \
  -H "Content-Type: image/jpeg" -H "x-upsert: true" \
  --data-binary "fake-jpeg-bytes-user1")
[ "$CODE" = "200" ] || fail "upload dans son dossier (attendu 200, obtenu $CODE)"
ok "upload avatar dans son propre dossier"

# --- Storage : upload dans le dossier d'autrui refusé ---
# (l'API Storage enveloppe le refus RLS en HTTP 400, corps statusCode 403)
RES=$(curl -s -X POST "$URL/storage/v1/object/$BUCKET/$U2/avatar.jpg" \
  -H "apikey: $KEY" -H "Authorization: Bearer $T1" \
  -H "Content-Type: image/jpeg" -H "x-upsert: true" \
  --data-binary "pirate")
echo "$RES" | grep -q 'row-level security' || fail "upload dans le dossier d'autrui (attendu refus RLS, obtenu $RES)"
ok "RLS storage bloque l'upload dans le dossier d'autrui"

# --- Colonne : update de son propre avatar_url (grant par colonne) ---
AV="https://example.test/$U1.jpg?v=1"
RES=$(curl -s -X PATCH "$URL/rest/v1/profiles?id=eq.$U1" \
  -H "apikey: $KEY" -H "Authorization: Bearer $T1" \
  -H "Content-Type: application/json" -H "Prefer: return=representation" \
  -d "{\"avatar_url\":\"$AV\"}")
echo "$RES" | grep -q "$U1.jpg" || fail "update de son propre avatar_url"
ok "update de son propre avatar_url"

# --- Colonne : avatar_url d'autrui lisible (profils select-authenticated) ---
RES=$(curl -s "$URL/rest/v1/profiles?id=eq.$U1&select=avatar_url" \
  -H "apikey: $KEY" -H "Authorization: Bearer $T2")
echo "$RES" | grep -q "$U1.jpg" || fail "lecture avatar_url d'autrui (attendu l'URL)"
ok "avatar_url lisible par un autre utilisateur"

# --- Colonne : update de l'avatar_url d'autrui refusé (RLS) ---
RES=$(curl -s -X PATCH "$URL/rest/v1/profiles?id=eq.$U2" \
  -H "apikey: $KEY" -H "Authorization: Bearer $T1" \
  -H "Content-Type: application/json" -H "Prefer: return=representation" \
  -d '{"avatar_url":"https://pirate.test/x.jpg"}')
[ "$RES" = "[]" ] || fail "RLS update avatar_url d'autrui (attendu [], obtenu $RES)"
ok "RLS bloque l'update de l'avatar_url d'autrui"

# --- RPC classement : avatar_url présent dans le retour ---
COMP=$(curl -s "$URL/rest/v1/competitions?select=id&limit=1" \
  -H "apikey: $KEY" -H "Authorization: Bearer $T1" | jqpy 'd[0]["id"] if d else ""')
if [ -n "$COMP" ]; then
  RES=$(curl -s -X POST "$URL/rest/v1/rpc/get_global_leaderboard" \
    -H "apikey: $KEY" -H "Authorization: Bearer $T1" \
    -H "Content-Type: application/json" \
    -d "{\"p_competition_id\":\"$COMP\",\"p_limit\":1}")
  ROWS=$(echo "$RES" | jqpy 'len(d) if isinstance(d,list) else -1')
  if [ "$ROWS" -gt 0 ]; then
    echo "$RES" | grep -q 'avatar_url' || fail "get_global_leaderboard sans avatar_url"
    ok "get_global_leaderboard renvoie avatar_url"
  elif [ "$ROWS" = "0" ]; then
    echo "⚠️  classement général vide (état dev connu) — colonne avatar_url garantie par la migration/typegen"
  else
    fail "get_global_leaderboard a échoué : $RES"
  fi
else
  echo "⚠️  aucune compétition seedée — check RPC avatar_url ignoré"
fi

# --- Nettoyage : retirer l'objet et remettre avatar_url à null ---
curl -s -o /dev/null -X DELETE "$URL/storage/v1/object/$BUCKET/$U1/avatar.jpg" \
  -H "apikey: $KEY" -H "Authorization: Bearer $T1"
curl -s -o /dev/null -X PATCH "$URL/rest/v1/profiles?id=eq.$U1" \
  -H "apikey: $KEY" -H "Authorization: Bearer $T1" \
  -H "Content-Type: application/json" -d '{"avatar_url":null}'
ok "nettoyage (objet supprimé, avatar_url remis à null)"

echo "🎉 e2e-avatars OK"
