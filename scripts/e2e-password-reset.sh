#!/usr/bin/env bash
# Vérification E2E du reset de mot de passe par code à 6 chiffres (template `recovery`).
# ⚠️ Envoie de VRAIS e-mails et crée un compte de test : utilise une adresse consultable.
#
# Le code n'est lisible que dans l'e-mail (GoTrue n'en stocke que l'empreinte), d'où
# deux passes :
#   1) EMAIL=ton.adresse@exemple.fr ./scripts/e2e-password-reset.sh          → prépare et envoie
#   2) EMAIL=... CODE=418207 ./scripts/e2e-password-reset.sh                 → déroule les assertions
set -euo pipefail

source .env
URL="$EXPO_PUBLIC_SUPABASE_URL"
KEY="$EXPO_PUBLIC_SUPABASE_KEY"
EMAIL="${EMAIL:-}"
CODE="${CODE:-}"
OLD_PASSWORD="${OLD_PASSWORD:-Tc-E2e-Reset-Old-2026!}"
NEW_PASSWORD="${NEW_PASSWORD:-Tc-E2e-Reset-New-2026!}"

fail() { echo "❌ $1"; exit 1; }
ok() { echo "✅ $1"; }

[ -n "$EMAIL" ] || fail "EMAIL=ton.adresse@exemple.fr requis (vraie boîte : le code arrive par e-mail)"
case "$EMAIL" in *@*.*) ;; *) fail "EMAIL invalide : $EMAIL" ;; esac
LOCAL="${EMAIL%@*}"; DOMAIN="${EMAIL#*@}"
TEST_EMAIL="$LOCAL+tc-reset@$DOMAIN"

# curl → "corps\ncode_http"
body() { echo "$1" | sed '$d'; }
status() { echo "$1" | tail -1; }

post() {
  curl -s -w '\n%{http_code}' -X POST "$URL/auth/v1/$1" \
    -H "apikey: $KEY" -H "Content-Type: application/json" -d "$2"
}

recover() { post "recover" "{\"email\":\"$TEST_EMAIL\"}"; }

verify() {
  post "verify" "{\"email\":\"$TEST_EMAIL\",\"token\":\"$1\",\"type\":\"recovery\"}"
}

login() {
  post "token?grant_type=password" "{\"email\":\"$TEST_EMAIL\",\"password\":\"$1\"}"
}

json() { python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('$1',''))"; }

# ---------------------------------------------------------------- passe 1
if [ -z "$CODE" ]; then
  echo "Compte de test : $TEST_EMAIL"

  RES=$(post "signup" "{\"email\":\"$TEST_EMAIL\",\"password\":\"$OLD_PASSWORD\",\"data\":{\"username\":\"E2eReset\"}}")
  case "$(status "$RES")" in
    200) ok "compte de test créé" ;;
    422) ok "compte de test déjà présent (réutilisé)" ;;
    *) fail "signup ($(status "$RES")) : $(body "$RES")" ;;
  esac

  RES=$(recover)
  [ "$(status "$RES")" = "200" ] || fail "recover (attendu 200, obtenu $(status "$RES"))"
  ok "code envoyé à $TEST_EMAIL"

  cat <<EOF

Relève le code à 6 chiffres dans l'e-mail « Réinitialise ton mot de passe », puis :

  EMAIL=$EMAIL CODE=<le code> bash scripts/e2e-password-reset.sh

(le code est valable 1 heure et ne sert qu'une fois)
EOF
  exit 0
fi

# ---------------------------------------------------------------- passe 2
echo "$CODE" | grep -qE '^[0-9]{6}$' || fail "CODE doit être 6 chiffres (obtenu « $CODE »)"

# Un code sûrement faux, dérivé du vrai : dernier chiffre décalé.
WRONG="${CODE:0:5}$(( (${CODE: -1} + 1) % 10 ))"
RES=$(verify "$WRONG")
[ "$(status "$RES")" = "403" ] || fail "code erroné (attendu 403, obtenu $(status "$RES"))"
body "$RES" | grep -q 'otp_expired' || fail "code erroné : attendu otp_expired, obtenu $(body "$RES")"
ok "code erroné refusé (403 otp_expired — le mapping i18n s'appuie dessus)"

RES=$(verify "$CODE")
[ "$(status "$RES")" = "200" ] || fail "vérification du code (attendu 200, obtenu $(status "$RES")) : $(body "$RES")"
TOKEN=$(body "$RES" | json access_token)
[ -n "$TOKEN" ] || fail "pas d'access_token dans la réponse de /verify"
ok "code vérifié, session ouverte"

RES=$(curl -s -w '\n%{http_code}' -X PUT "$URL/auth/v1/user" \
  -H "apikey: $KEY" -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" -d "{\"password\":\"$NEW_PASSWORD\"}")
[ "$(status "$RES")" = "200" ] || fail "changement de mot de passe (obtenu $(status "$RES")) : $(body "$RES")"
ok "nouveau mot de passe enregistré"

RES=$(login "$NEW_PASSWORD")
[ "$(status "$RES")" = "200" ] || fail "connexion avec le NOUVEAU mot de passe (obtenu $(status "$RES"))"
ok "connexion avec le nouveau mot de passe"

RES=$(login "$OLD_PASSWORD")
[ "$(status "$RES")" = "400" ] || fail "l'ANCIEN mot de passe fonctionne encore (obtenu $(status "$RES")) — le reset n'a pas pris"
ok "ancien mot de passe refusé (c'est ça qui prouve le reset)"

RES=$(verify "$CODE")
[ "$(status "$RES")" = "403" ] || fail "code rejoué (attendu 403, obtenu $(status "$RES")) — il devrait être à usage unique"
ok "code à usage unique"

recover >/dev/null
RES=$(recover)
[ "$(status "$RES")" = "429" ] || fail "deux envois rapprochés (attendu 429, obtenu $(status "$RES")) — vérifier RESEND_COOLDOWN_MS"
ok "renvoi trop rapide refusé (429 — cale le cooldown de l'app à 60 s)"

cat <<EOF

Parcours de reset validé de bout en bout.

Nettoyage du compte de test :
  delete from auth.users where email = '$TEST_EMAIL';
EOF
