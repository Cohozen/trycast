#!/usr/bin/env bash
# Vérification E2E RGPD (Lot 7) : RLS own-rows de la table `consents` (append-only,
# isolation par user, écriture directe update/delete refusée), Edge Function
# `export-data` (auth par JWT, JSON du compte appelant) et étanchéité des tables
# de la waitlist (aucune lecture cliente). La section export-data est ignorée tant
# que l'EF n'est pas déployée (`supabase functions deploy export-data`).
#
# Ce script n'utilise que la clé publishable : les assertions qui demandent un
# accès privilégié (format du haché d'IP, plafond du rate limit) sont dans
# scripts/e2e-waitlist.sql, à jouer dans l'éditeur SQL du dashboard.
#
# Prérequis : scripts/seed-test-users.sql.
# Usage : EMAIL1=... EMAIL2=... PASSWORD=... ./scripts/e2e-privacy.sh
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

# --- consents : RLS own-rows ---

# user1 enregistre un consentement (insert append-only)
RES=$(curl -s -X POST "$URL/rest/v1/consents" \
  -H "apikey: $KEY" -H "Authorization: Bearer $T1" \
  -H "Content-Type: application/json" -H "Prefer: return=representation" \
  -d "{\"user_id\":\"$U1\",\"type\":\"communications\",\"granted\":true}")
echo "$RES" | grep -q '"granted":true' || fail "insert consent user1 (obtenu $RES)"
ok "insert consent (communications) par user1"

# user1 voit ses propres consentements
CNT=$(curl -s "$URL/rest/v1/consents?type=eq.communications&select=granted" \
  -H "apikey: $KEY" -H "Authorization: Bearer $T1" |
  python3 -c 'import json,sys; print(len(json.load(sys.stdin)))')
[ "$CNT" -ge 1 ] || fail "select own consents (attendu >=1, obtenu $CNT)"
ok "user1 voit ses consentements"

# Isolation : user2 ne voit pas ceux de user1
RES=$(curl -s "$URL/rest/v1/consents?user_id=eq.$U1&select=granted" \
  -H "apikey: $KEY" -H "Authorization: Bearer $T2")
[ "$RES" = "[]" ] || fail "isolation consents (attendu [], obtenu $RES)"
ok "consentements invisibles pour un autre user"

# with_check RLS : user2 ne peut pas insérer une ligne au nom de user1
RES=$(curl -s -X POST "$URL/rest/v1/consents" \
  -H "apikey: $KEY" -H "Authorization: Bearer $T2" \
  -H "Content-Type: application/json" \
  -d "{\"user_id\":\"$U1\",\"type\":\"communications\",\"granted\":false}")
echo "$RES" | grep -q '42501' || fail "insert au nom d'autrui (attendu 42501, obtenu $RES)"
ok "insert de consentement au nom d'un autre refusé"

# Les types de télémétrie du Lot B sont acceptés, et le check reste fermé :
# la table est la trace horodatée du choix (le garde-fou runtime, lui, est une
# préférence locale à l'appareil — les SDK démarrent avant toute session).
for TYPE in analytics diagnostics; do
  RES=$(curl -s -X POST "$URL/rest/v1/consents" \
    -H "apikey: $KEY" -H "Authorization: Bearer $T1" \
    -H "Content-Type: application/json" -H "Prefer: return=representation" \
    -d "{\"user_id\":\"$U1\",\"type\":\"$TYPE\",\"granted\":false}")
  echo "$RES" | grep -q '"granted":false' || fail "insert consent $TYPE (obtenu $RES)"
done
ok "consentements analytics et diagnostics enregistrables"

RES=$(curl -s -X POST "$URL/rest/v1/consents" \
  -H "apikey: $KEY" -H "Authorization: Bearer $T1" \
  -H "Content-Type: application/json" \
  -d "{\"user_id\":\"$U1\",\"type\":\"tracking_publicitaire\",\"granted\":true}")
echo "$RES" | grep -q '23514' || fail "type de consentement inconnu (attendu 23514, obtenu $RES)"
ok "type de consentement hors catalogue refusé"

# Append-only : pas de grant update/delete → écriture directe refusée
RES=$(curl -s -X PATCH "$URL/rest/v1/consents?type=eq.communications" \
  -H "apikey: $KEY" -H "Authorization: Bearer $T1" \
  -H "Content-Type: application/json" -d '{"granted":false}')
echo "$RES" | grep -q '42501' || fail "update direct consents (attendu 42501, obtenu $RES)"
RES=$(curl -s -X DELETE "$URL/rest/v1/consents?type=eq.communications" \
  -H "apikey: $KEY" -H "Authorization: Bearer $T1")
echo "$RES" | grep -q '42501' || fail "delete direct consents (attendu 42501, obtenu $RES)"
ok "update/delete direct de consents refusé (append-only)"

# --- waitlist : aucune donnée lisible côté client ---

# RLS sans policy + aucun grant : les trois tables sont muettes pour anon comme
# pour un utilisateur connecté. C'est ce qui protège la liste d'e-mails et, pour
# waitlist_salts, le sel qui rend les hachés d'IP irréversibles.
for TABLE in waitlist_signups waitlist_attempts waitlist_salts; do
  RES=$(curl -s "$URL/rest/v1/$TABLE?select=*" -H "apikey: $KEY")
  echo "$RES" | grep -qE '42501|PGRST' || fail "lecture de $TABLE (attendu un refus, obtenu $RES)"
  RES=$(curl -s "$URL/rest/v1/$TABLE?select=*" -H "apikey: $KEY" -H "Authorization: Bearer $T1")
  echo "$RES" | grep -qE '42501|PGRST' || fail "lecture de $TABLE authentifiée (attendu un refus, obtenu $RES)"
done
ok "tables waitlist illisibles (anon et authentifié)"

# --- export-data : Edge Function ---

CODE=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$URL/functions/v1/export-data" \
  -H "apikey: $KEY")
if [ "$CODE" = "404" ]; then
  echo "⚠️  export-data non déployée (404) — section ignorée. Déployer : supabase functions deploy export-data"
  exit 0
fi

# Sans JWT valide : 401
[ "$CODE" = "401" ] || fail "export-data sans JWT (attendu 401, obtenu $CODE)"
ok "export-data refuse un appel non authentifié"

# Avec JWT : 200 + JSON du compte appelant
RES=$(curl -s -X POST "$URL/functions/v1/export-data" \
  -H "apikey: $KEY" -H "Authorization: Bearer $T1")
echo "$RES" | grep -q "\"id\":\"$U1\"" || fail "export-data JWT (id du compte attendu, obtenu $RES)"
echo "$RES" | grep -q '"consents"' || fail "export-data structure (bloc consents attendu)"
ok "export-data renvoie le JSON du compte appelant"

echo "🎉 e2e-privacy OK"
