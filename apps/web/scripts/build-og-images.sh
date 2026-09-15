#!/usr/bin/env bash
# Vignettes OpenGraph du site (1200×630), celles qu'affichent WhatsApp, iMessage
# ou Discord quand on colle un lien TryCast.
#
# Régénère apps/web/public/og-default.png, sa version anglaise og-default-en.png
# (landing /en/, choisie par landing-page.astro) et apps/web/public/og-invite.png. Les PNG sont
# versionnés : ce script ne tourne ni en CI ni au build, il n'existe que pour
# reproduire les images à l'identique. Il demande ImageMagick (`brew install
# imagemagick`) et lit les polices du design system dans les node_modules de
# l'app Expo (apps/mobile) — pas de police système, pas de CDN.
#
# Le motif du ballon est celui de apps/web/src/components/ball-logo.astro (viewBox
# 120×120, passe vissée, rotation -25°), tracé ici à l'échelle 4 puis réduit :
# ImageMagick n'a pas de délégué SVG fiable, et un rendu approximatif du logo
# serait plus visible sur une vignette que partout ailleurs.
set -euo pipefail

cd "$(dirname "$0")/.."

FONTS="../mobile/node_modules/@expo-google-fonts"
ANTON="$FONTS/anton/400Regular/Anton_400Regular.ttf"
INTER="$FONTS/inter/600SemiBold/Inter_600SemiBold.ttf"

for f in "$ANTON" "$INTER"; do
    [ -f "$f" ] || { echo "Police absente : $f (npm install dans apps/mobile ?)" >&2; exit 1; }
done

BG='#100e0b'        # char-900 — base charbon chaud du thème sombre
TEXT='#f8f5ef'      # paper-100
MUTED='#cdc4b3'     # paper-300
BALL='#e63e63'      # grenat-500 — l'étincelle
TRAIL='#f06485'     # grenat-400
LACES='#f1ebdd'

BALL_PNG="$(mktemp -t trycast-ball).png"
trap 'rm -f "$BALL_PNG"' EXIT

# Ballon à l'échelle 4 (480×480) puis réduit : antialiasing propre sur les
# lacets, qui font 2px dans le motif d'origine.
XF='translate 288,216 rotate -25 translate -288,-216'
CAP='stroke-linecap round'

magick -size 480x480 xc:none \
    -draw "$XF stroke $TRAIL stroke-opacity 0.7 stroke-width 16 $CAP line 160,172 68,172" \
    -draw "$XF stroke $TRAIL stroke-opacity 0.7 stroke-width 16 $CAP line 160,260 68,260" \
    -draw "$XF stroke $TRAIL stroke-width 24 $CAP line 152,216 40,216" \
    -draw "$XF fill $BALL stroke none ellipse 288,216 120,68 0,360" \
    -draw "$XF stroke $LACES fill none stroke-width 10 $CAP line 184,216 392,216" \
    -draw "$XF stroke $LACES fill none stroke-width 8 $CAP line 224,198 224,234" \
    -draw "$XF stroke $LACES fill none stroke-width 8 $CAP line 256,194 256,238" \
    -draw "$XF stroke $LACES fill none stroke-width 8 $CAP line 288,192 288,240" \
    -draw "$XF stroke $LACES fill none stroke-width 8 $CAP line 320,194 320,238" \
    -filter Lanczos -resize 260x260 \
    "$BALL_PNG"

# $1 = fichier de sortie, $2 = accroche sous le wordmark
render() {
    magick -size 1200x630 "xc:$BG" \
        "$BALL_PNG" -gravity north -geometry +0+74 -composite \
        -font "$ANTON" -pointsize 128 -kerning 5 -fill "$TEXT" \
        -gravity north -annotate +0+318 'TRYCAST' \
        -font "$INTER" -pointsize 37 -kerning 0 -fill "$MUTED" \
        -gravity north -annotate +0+468 "$2" \
        -fill "$BALL" -draw 'rectangle 0,624 1200,630' \
        "$1"
    echo "  $1"
}

echo "Vignettes OpenGraph :"
render public/og-default.png 'Pronostics rugby entre amis'
render public/og-default-en.png 'Rugby predictions with your mates'
render public/og-invite.png  'Rejoins ma ligue de pronostics'
