#!/usr/bin/env bash
# Vérification E2E de l'envoi d'e-mails d'auth (SMTP custom Resend).
# ⚠️ Ce script envoie de VRAIS e-mails : utilise une adresse que tu peux consulter.
#    Il crée aussi des comptes de test (plus-addressing) — voir le nettoyage en fin de sortie.
# Usage : EMAIL=ton.adresse@exemple.fr ./scripts/e2e-email.sh
set -euo pipefail

source .env
URL="$EXPO_PUBLIC_SUPABASE_URL"
KEY="$EXPO_PUBLIC_SUPABASE_KEY"
WEB="${EXPO_PUBLIC_WEB_URL:-https://www.trycast.fr}"
EMAIL="${EMAIL:-}"
PASSWORD="${PASSWORD:-Tc-E2e-Email-2026!}"
TAG="tc$(date +%H%M%S)"

fail() { echo "❌ $1"; exit 1; }
ok() { echo "✅ $1"; }

[ -n "$EMAIL" ] || fail "EMAIL=ton.adresse@exemple.fr requis (une vraie boîte, les e-mails partent pour de bon)"
case "$EMAIL" in *@*.*) ;; *) fail "EMAIL invalide : $EMAIL" ;; esac
LOCAL="${EMAIL%@*}"; DOMAIN="${EMAIL#*@}"
addr() { echo "$LOCAL+$TAG-$1@$DOMAIN"; }

REDIRECT=$(python3 -c "import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1], safe=''))" "$WEB/app/confirme")

# 3 signups d'affilée : valide le transport SMTP ET que le plafond de 2 e-mails/h a bien sauté
for n in 1 2 3; do
  A=$(addr "$n")
  RES=$(curl -s -X POST "$URL/auth/v1/signup?redirect_to=$REDIRECT" \
    -H "apikey: $KEY" -H "Content-Type: application/json" \
    -d "{\"email\":\"$A\",\"password\":\"$PASSWORD\",\"data\":{\"username\":\"Mail$TAG$n\"}}")
  echo "$RES" | grep -q 'confirmation_sent_at' || fail "signup #$n ($A) : $RES"
  ok "signup #$n → e-mail de confirmation envoyé à $A"
  sleep 2
done
ok "3 e-mails en moins d'une minute : le plafond de 2/h du SMTP intégré est bien levé"

# Reset password sur le premier compte
RES=$(curl -s -w '%{http_code}' -o /dev/null -X POST "$URL/auth/v1/recover" \
  -H "apikey: $KEY" -H "Content-Type: application/json" -d "{\"email\":\"$(addr 1)\"}")
[ "$RES" = "200" ] || fail "recover (attendu 200, obtenu $RES)"
ok "reset password → e-mail envoyé à $(addr 1)"

cat <<EOF

4 e-mails sont partis. À vérifier à l'œil dans la boîte :
  • expéditeur attendu (domaine trycast.fr), sujet et rendu des templates
  • arrivée en boîte de réception et non en spam
  • le lien de confirmation atterrit sur $WEB/app/confirme
  • en-têtes du message : SPF et DKIM à « pass »
Côté Resend (dashboard → Emails) : 4 lignes en statut Delivered.

Nettoyage des comptes de test créés par ce run :
  delete from auth.users where email like '%+$TAG-%';
EOF
