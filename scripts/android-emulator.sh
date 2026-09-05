#!/bin/sh
# Démarre l'émulateur Android et attend qu'il soit RÉELLEMENT prêt.
#   npm run android:emulator
#
# L'attente est le cœur du script : `emulator` rend la main dès que la fenêtre
# s'ouvre, bien avant que le système soit démarré. Lancer `expo run:android`
# à ce moment-là échoue à l'installation de l'APK, avec une erreur qui ne dit
# pas qu'il s'agit d'un problème de timing.
set -e

. ./scripts/android-env.sh

if adb devices | sed -n '2,$p' | grep -q 'device$'; then
    printf '\033[32m✔\033[0m Un appareil est déjà connecté :\n'
    adb devices | sed -n '2,$p' | grep 'device$' | sed 's/^/  /'
    exit 0
fi

if ! emulator -list-avds 2>/dev/null | grep -qx "$TRYCAST_AVD"; then
    printf '\033[31m✖ AVD « %s » introuvable.\033[0m\n' "$TRYCAST_AVD" >&2
    printf '  Disponibles :\n' >&2
    emulator -list-avds 2>/dev/null | sed 's/^/    /' >&2
    printf '  Créer un AVD : Android Studio → Device Manager\n' >&2
    exit 1
fi

printf 'Démarrage de %s…\n' "$TRYCAST_AVD"
# ⚠️ NE PAS remettre -no-snapshot-save ici (erreur commise le 2026-09-05, corrigée
# le jour même). Ce drapeau ne fait pas « repartir d'un état propre » : il JETTE
# tout ce qui a été fait pendant la session et rebascule sur le dernier instantané.
# Conséquence vécue : le dev client installé le matin avait disparu au redémarrage,
# l'émulateur avait retrouvé son build release, et le npm run android suivant
# échouait en INSTALL_FAILED_UPDATE_INCOMPATIBLE après cinq minutes de Gradle.
# Le Quick Boot par défaut sauvegarde à l'extinction : c'est ce qu'on veut, une app
# installée doit survivre. Pour repartir vraiment de zéro, c'est -no-snapshot-load
# (démarrage à froid), et ça se demande explicitement.
emulator -avd "$TRYCAST_AVD" >/dev/null 2>&1 &

adb wait-for-device
# sys.boot_completed passe à 1 quand le launcher est prêt ; sans cette boucle,
# `adb install` peut encore répondre « device offline ».
printf 'Démarrage du système'
while [ "$(adb shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" != '1' ]; do
    printf '.'
    sleep 2
done
echo

printf '\033[32m✔\033[0m Émulateur prêt : %s (Android %s)\n' \
    "$TRYCAST_AVD" "$(adb shell getprop ro.build.version.release | tr -d '\r')"
