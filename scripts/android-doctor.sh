#!/bin/sh
# Diagnostic de la chaîne Android locale. Ne construit rien, n'installe rien.
#   npm run android:doctor
set -e

. ./scripts/android-env.sh

ok()   { printf '\033[32m✔\033[0m %s\n' "$1"; }
warn() { printf '\033[33m!\033[0m %s\n' "$1"; }

echo 'Chaîne Android locale'
echo '---------------------'
ok "JDK      $("$JAVA_HOME/bin/java" -version 2>&1 | head -1)"
printf '           %s\n' "$JAVA_HOME"
ok "SDK      $ANDROID_HOME"
printf '           plateformes : %s\n' "$(ls "$ANDROID_HOME/platforms" 2>/dev/null | tr '\n' ' ')"
ok "adb      $(adb version | head -1)"

echo
avds=$(emulator -list-avds 2>/dev/null)
if printf '%s\n' "$avds" | grep -qx "$TRYCAST_AVD"; then
    ok "AVD      $TRYCAST_AVD"
else
    warn "AVD « $TRYCAST_AVD » introuvable. Disponibles :"
    printf '%s\n' "$avds" | sed 's/^/           /'
    printf '           Créer un AVD : Android Studio → Device Manager\n'
    printf '           Ou viser le bon : TRYCAST_AVD=<nom> npm run android\n'
fi

echo
devices=$(adb devices | sed -n '2,$p' | grep -c 'device$' || true)
if [ "$devices" -gt 0 ]; then
    ok "$devices appareil(s) connecté(s) :"
    adb devices | sed -n '2,$p' | grep 'device$' | sed 's/^/           /'
else
    warn 'Aucun appareil connecté — `npm run android:emulator` pour démarrer l'"'"'émulateur.'
fi

echo
printf 'Architecture native compilée en local : %s\n' "$ORG_GRADLE_PROJECT_reactNativeArchitectures"
