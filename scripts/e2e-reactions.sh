#!/usr/bin/env bash
# Vérification E2E des réactions sur les pronos (set_/clear_prediction_reaction,
# get_match_league_predictions, get_prediction_reactors, table fermée) contre
# le projet DEV.
# Prérequis : scripts/seed-test-users.sql PUIS scripts/seed-test-reactions.sql,
# à rejouer avant CHAQUE exécution (le script fait quitter la ligue à user2).
# Usage : EMAIL1=... EMAIL2=... PASSWORD=... bash scripts/e2e-reactions.sh
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
U2=$(echo "$S2" | json 'd["user"]["id"]')
ok "login des deux users"

COMP=$(get "$T1" "competitions?slug=eq.e2e-reactions&select=id" | json 'd[0]["id"]') ||
  fail "compétition e2e-reactions introuvable (seed-test-reactions.sql manquant ?)"
match() { get "$T1" "matches?competition_id=eq.$COMP&api_game_id=eq.$1&select=id" | json 'd[0]["id"]'; }
M301=$(match -301); M302=$(match -302)
LEAGUE=$(get "$T1" "leagues?invite_code=eq.E2ERCTS3&select=id" | json 'd[0]["id"]') ||
  fail "ligue E2ERCTS3 introuvable"
ok "matchs et ligue de test trouvés"

# react TOKEN MATCH TARGET REACTION
react() {
  rpc "$1" set_prediction_reaction \
    "{\"p_league_id\":\"$LEAGUE\",\"p_match_id\":\"$2\",\"p_target_user_id\":\"$3\",\"p_reaction\":\"$4\"}"
}
unreact() {
  rpc "$1" clear_prediction_reaction \
    "{\"p_league_id\":\"$LEAGUE\",\"p_match_id\":\"$2\",\"p_target_user_id\":\"$3\"}"
}
# row TOKEN FIELD — champ de la ligne de user1 sur -301, vu par TOKEN
row() {
  rpc "$1" get_match_league_predictions "{\"p_match_id\":\"$M301\",\"p_league_id\":\"$LEAGUE\"}" |
    json "json.dumps([r['$2'] for r in d if r['user_id']=='$U1'][0], sort_keys=True)"
}
reactors() {
  rpc "$1" get_prediction_reactors \
    "{\"p_league_id\":\"$LEAGUE\",\"p_match_id\":\"$M301\",\"p_target_user_id\":\"$U1\"}"
}

# 1. Pose : user2 réagit au prono de user1
RES=$(react "$T2" "$M301" "$U1" bravo)
[ -z "$RES" ] || fail "pose de la réaction ($RES)"
[ "$(row "$T1" reactions)" = '{"bravo": 1}' ] || fail "compteurs vus par user1 ($(row "$T1" reactions))"
[ "$(row "$T1" my_reaction)" = "null" ] || fail "my_reaction de user1 ($(row "$T1" my_reaction))"
[ "$(row "$T2" my_reaction)" = '"bravo"' ] || fail "my_reaction de user2 ($(row "$T2" my_reaction))"
ok "réaction posée, compteurs et my_reaction exposés"

# 2. Remplacement : une seule réaction par personne et par prono
react "$T2" "$M301" "$U1" laugh >/dev/null
[ "$(row "$T1" reactions)" = '{"laugh": 1}' ] || fail "remplacement ($(row "$T1" reactions))"
ok "réaction remplacée, pas ajoutée"

# 3. Retrait puis nouvelle pose
unreact "$T2" "$M301" "$U1" >/dev/null
[ "$(row "$T1" reactions)" = '{}' ] || fail "retrait ($(row "$T1" reactions))"
react "$T2" "$M301" "$U1" lucky >/dev/null
[ "$(row "$T1" reactions)" = '{"lucky": 1}' ] || fail "nouvelle pose ($(row "$T1" reactions))"
ok "réaction retirée puis reposée"

# 4. Refus
RES=$(react "$T1" "$M301" "$U1" bravo)
echo "$RES" | grep -q '"self_reaction"' || fail "réaction à soi-même ($RES)"
RES=$(react "$T2" "$M301" "$U1" fire)
echo "$RES" | grep -q '"invalid_reaction"' || fail "clé inconnue ($RES)"
RES=$(react "$T2" "$M302" "$U1" bravo)
echo "$RES" | grep -q '"not_started"' || fail "match pas commencé ($RES)"
RES=$(react "$T1" "$M301" "$U2" bravo)
echo "$RES" | grep -q '"no_prediction"' || fail "cible sans prono ($RES)"
RES=$(react "$T1" "$M301" "00000000-0000-0000-0000-000000000000" bravo)
echo "$RES" | grep -q '"not_member"' || fail "cible hors ligue ($RES)"
ok "refus : soi-même, clé inconnue, avant kickoff, sans prono, hors ligue"

# 5. Table fermée au client, en lecture comme en écriture
RES=$(curl -s -o /dev/null -w '%{http_code}' "$URL/rest/v1/prediction_reactions?select=reaction" \
  -H "apikey: $KEY" -H "Authorization: Bearer $T1")
[ "$RES" = "401" ] || [ "$RES" = "403" ] || fail "lecture directe de prediction_reactions (HTTP $RES)"
RES=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$URL/rest/v1/prediction_reactions" \
  -H "apikey: $KEY" -H "Authorization: Bearer $T2" -H "Content-Type: application/json" \
  -d "{\"league_id\":\"$LEAGUE\",\"match_id\":\"$M301\",\"target_user_id\":\"$U1\",\"reactor_id\":\"$U2\",\"reaction\":\"bravo\"}")
[ "$RES" = "401" ] || [ "$RES" = "403" ] || fail "insert direct dans prediction_reactions (HTTP $RES)"
ok "table fermée au client (lecture et insert refusés)"

# 6. Liste nominative : user2 membre, identifié
RES=$(reactors "$T1")
[ "$(echo "$RES" | json 'len(d)')" = "1" ] || fail "liste des auteurs ($RES)"
[ "$(echo "$RES" | json 'd[0]["user_id"]')" = "$U2" ] || fail "auteur identifié ($RES)"
[ "$(echo "$RES" | json 'd[0]["is_member"]')" = "True" ] || fail "auteur membre ($RES)"
ok "liste des auteurs : membre identifié"

# 7. user2 quitte la ligue : sa réaction reste comptée, et devient anonyme
RES=$(curl -s -o /dev/null -w '%{http_code}' -X DELETE \
  "$URL/rest/v1/league_members?league_id=eq.$LEAGUE&user_id=eq.$U2" \
  -H "apikey: $KEY" -H "Authorization: Bearer $T2")
[ "$RES" = "204" ] || fail "départ de user2 (HTTP $RES)"
[ "$(row "$T1" reactions)" = '{"lucky": 1}' ] || fail "réaction après départ ($(row "$T1" reactions))"
RES=$(reactors "$T1")
[ "$(echo "$RES" | json 'd[0]["is_member"]')" = "False" ] || fail "ancien membre signalé ($RES)"
[ "$(echo "$RES" | json 'd[0]["user_id"] is None and d[0]["username"] is None and d[0]["avatar_url"] is None')" = "True" ] ||
  fail "ancien membre anonymisé ($RES)"
ok "réaction conservée après le départ, auteur anonymisé"

# 8. Ex-membre : ne peut plus réagir, mais peut retirer sa réaction
RES=$(react "$T2" "$M301" "$U1" bravo)
echo "$RES" | grep -q '"not_member"' || fail "réaction d'un ex-membre ($RES)"
[ "$(reactors "$T2" | json 'len(d)')" = "0" ] || fail "l'ex-membre lit encore les auteurs"
unreact "$T2" "$M301" "$U1" >/dev/null
[ "$(row "$T1" reactions)" = '{}' ] || fail "retrait par l'ex-membre ($(row "$T1" reactions))"
ok "ex-membre : réaction refusée, lecture fermée, retrait possible"

# 9. Anonyme : RPC fermée
RES=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$URL/rest/v1/rpc/set_prediction_reaction" \
  -H "apikey: $KEY" -H "Content-Type: application/json" \
  -d "{\"p_league_id\":\"$LEAGUE\",\"p_match_id\":\"$M301\",\"p_target_user_id\":\"$U1\",\"p_reaction\":\"bravo\"}")
[ "$RES" = "401" ] || [ "$RES" = "403" ] || [ "$RES" = "404" ] || fail "set_prediction_reaction en anon (HTTP $RES)"
ok "set_prediction_reaction fermée aux anonymes (HTTP $RES)"

echo "🎉 E2E réactions : tout est vert"
