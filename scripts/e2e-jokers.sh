#!/usr/bin/env bash
# Vérification E2E du joker par phase (set_phase_joker / clear_phase_joker,
# RLS de phase_jokers, get_match_league_predictions) contre le projet DEV.
# Prérequis : scripts/seed-test-users.sql PUIS scripts/seed-test-jokers.sql,
# à rejouer avant CHAQUE exécution (le script pose et déplace des jokers).
# Usage : EMAIL1=... EMAIL2=... PASSWORD=... bash scripts/e2e-jokers.sh
set -euo pipefail

source apps/mobile/.env
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
json() { python3 -c "import json,sys; d=json.load(sys.stdin); print($1)"; }
fail() { echo "❌ $1"; exit 1; }
ok() { echo "✅ $1"; }

# get TOKEN PATH — GET PostgREST
get() { curl -s "$URL/rest/v1/$2" -H "apikey: $KEY" -H "Authorization: Bearer $1"; }
# rpc TOKEN NAME BODY
rpc() {
  curl -s -X POST "$URL/rest/v1/rpc/$2" -H "apikey: $KEY" -H "Authorization: Bearer $1" \
    -H "Content-Type: application/json" -d "$3"
}

S1=$(login "$EMAIL1")
S2=$(login "$EMAIL2")
T1=$(echo "$S1" | json 'd["access_token"]') || fail "login user1"
T2=$(echo "$S2" | json 'd["access_token"]') || fail "login user2"
U1=$(echo "$S1" | json 'd["user"]["id"]')
ok "login des deux users"

COMP=$(get "$T1" "competitions?slug=eq.e2e-jokers&select=id" | json 'd[0]["id"]') ||
  fail "compétition e2e-jokers introuvable (seed-test-jokers.sql manquant ?)"
match() { get "$T1" "matches?competition_id=eq.$COMP&api_game_id=eq.$1&select=id" | json 'd[0]["id"]'; }
M201=$(match -201); M203=$(match -203); M204=$(match -204)
M205=$(match -205); M206=$(match -206); M207=$(match -207)
PHASE_A=$(get "$T1" "competition_phases?competition_id=eq.$COMP&key=eq.e2e_a&select=id" | json 'd[0]["id"]')
PHASE_B=$(get "$T1" "competition_phases?competition_id=eq.$COMP&key=eq.e2e_b&select=id" | json 'd[0]["id"]')
ok "matchs et phases de test trouvés"

# 1. Pose sur un match à venir de la phase B
RES=$(rpc "$T1" set_phase_joker "{\"p_match_id\":\"$M204\"}")
[ "$RES" = "\"$PHASE_B\"" ] || fail "pose du joker sur -204 ($RES)"
ok "joker posé (la RPC renvoie la phase)"

# 2. Déplacement dans la même phase : une seule ligne, sur le nouveau match
rpc "$T1" set_phase_joker "{\"p_match_id\":\"$M205\"}" >/dev/null
RES=$(get "$T1" "phase_jokers?phase_id=eq.$PHASE_B&select=match_id")
[ "$(echo "$RES" | json 'len(d)')" = "1" ] || fail "un seul joker par phase ($RES)"
[ "$(echo "$RES" | json 'd[0]["match_id"]')" = "$M205" ] || fail "déplacement vers -205 ($RES)"
ok "joker déplacé, toujours un seul par phase"

# 3. Refus : pas de prono sur le match
RES=$(rpc "$T1" set_phase_joker "{\"p_match_id\":\"$M206\"}")
echo "$RES" | grep -q '"no_prediction"' || fail "pose sans prono ($RES)"
ok "pose refusée sans prono (P0002 no_prediction)"

# 4. Refus : match commencé
RES=$(rpc "$T1" set_phase_joker "{\"p_match_id\":\"$M203\"}")
echo "$RES" | grep -q '"match_started"' || fail "pose sur match commencé ($RES)"
ok "pose refusée sur un match commencé (42501 match_started)"

# 5. Refus : match hors de toute phase
RES=$(rpc "$T1" set_phase_joker "{\"p_match_id\":\"$M207\"}")
echo "$RES" | grep -q '"no_phase"' || fail "pose hors phase ($RES)"
ok "pose refusée hors phase (P0002 no_phase)"

# 6. Joker consommé (phase A, posé sur -203 commencé) : ni déplaçable ni retirable
RES=$(rpc "$T1" set_phase_joker "{\"p_match_id\":\"$M201\"}")
echo "$RES" | grep -q '"joker_locked"' || fail "déplacement d'un joker consommé ($RES)"
RES=$(rpc "$T1" clear_phase_joker "{\"p_phase_id\":\"$PHASE_A\"}")
echo "$RES" | grep -q '"joker_locked"' || fail "retrait d'un joker consommé ($RES)"
ok "joker consommé verrouillé (42501 joker_locked)"

# 7. Retrait puis nouvelle pose (phase B)
rpc "$T1" clear_phase_joker "{\"p_phase_id\":\"$PHASE_B\"}" >/dev/null
[ "$(get "$T1" "phase_jokers?phase_id=eq.$PHASE_B&select=match_id" | json 'len(d)')" = "0" ] ||
  fail "retrait du joker de la phase B"
rpc "$T1" set_phase_joker "{\"p_match_id\":\"$M204\"}" >/dev/null
ok "joker retiré puis reposé"

# 8. Aucune écriture directe sur la table
RES=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$URL/rest/v1/phase_jokers" \
  -H "apikey: $KEY" -H "Authorization: Bearer $T1" -H "Content-Type: application/json" \
  -d "{\"user_id\":\"$U1\",\"phase_id\":\"$PHASE_A\",\"match_id\":\"$M201\"}")
[ "$RES" = "401" ] || [ "$RES" = "403" ] || fail "insert direct dans phase_jokers (HTTP $RES)"
ok "insert direct refusé (HTTP $RES)"

# 9. user2 ne voit pas les jokers de user1
[ "$(get "$T2" "phase_jokers?select=match_id" | json 'len(d)')" = "0" ] ||
  fail "user2 voit des jokers qui ne sont pas les siens"
ok "jokers invisibles aux autres (RLS)"

# 10. Ligue : is_joker exposé après le kickoff, rien avant
LEAGUE=$(get "$T1" "leagues?invite_code=eq.E2EJKRS2&select=id" | json 'd[0]["id"]')
RES=$(rpc "$T2" get_match_league_predictions "{\"p_match_id\":\"$M203\",\"p_league_id\":\"$LEAGUE\"}")
[ "$(echo "$RES" | json "[r['is_joker'] for r in d if r['user_id']=='$U1'][0]")" = "True" ] ||
  fail "is_joker de user1 après kickoff ($RES)"
RES=$(rpc "$T2" get_match_league_predictions "{\"p_match_id\":\"$M204\",\"p_league_id\":\"$LEAGUE\"}")
[ "$(echo "$RES" | json 'len(d)')" = "0" ] || fail "RPC de ligue avant kickoff ($RES)"
ok "joker visible de la ligue après kickoff seulement"

# 11. Anonyme : RPC fermée
RES=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$URL/rest/v1/rpc/set_phase_joker" \
  -H "apikey: $KEY" -H "Content-Type: application/json" -d "{\"p_match_id\":\"$M204\"}")
[ "$RES" = "401" ] || [ "$RES" = "403" ] || [ "$RES" = "404" ] || fail "set_phase_joker en anon (HTTP $RES)"
ok "set_phase_joker fermée aux anonymes (HTTP $RES)"

echo "🎉 E2E jokers : tout est vert"
