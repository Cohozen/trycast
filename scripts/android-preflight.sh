#!/bin/sh
# Vérifie, AVANT de lancer Gradle, qu'aucun appareil connecté ne porte un build
# incompatible avec le dev client.
#
# Sans ce contrôle, le conflit ne se révèle qu'à l'installation, c'est-à-dire
# après cinq minutes de compilation, sous la forme d'un message qui ne dit ni
# quel appareil est en cause ni quoi faire :
#   INSTALL_FAILED_UPDATE_INCOMPATIBLE: signatures do not match newer version
#
# Le dev client local est signé par android/app/debug.keystore ; les builds EAS
# (preview, production, Play Store) le sont par une clé EAS. Les deux ne peuvent
# pas coexister sous le même nom de paquet.
#
# On n'agit jamais à la place de Corentin : désinstaller efface les données de
# l'app sur l'appareil visé, ce qui est gratuit sur un émulateur et coûteux sur
# son téléphone. Le script affiche la commande, il ne la joue pas.
set -e

PACKAGE=com.cohozen.trycast

conflit=0
for serial in $(adb devices | sed -n '2,$p' | grep 'device$' | cut -f1); do
    installed=$(adb -s "$serial" shell pm list packages "$PACKAGE" 2>/dev/null | tr -d '\r')
    [ -z "$installed" ] && continue

    # Un build de debug porte le drapeau DEBUGGABLE ; un build de release, non.
    # C'est le discriminant le plus lisible : pas de digest de certificat à
    # extraire, et il se lit de la même façon sur toutes les versions d'Android.
    if adb -s "$serial" shell dumpsys package "$PACKAGE" 2>/dev/null | grep -q 'DEBUGGABLE'; then
        continue
    fi

    conflit=1
    model=$(adb -s "$serial" shell getprop ro.product.model 2>/dev/null | tr -d '\r')
    printf '\033[31m✖ %s porte un build de RELEASE de %s.\033[0m\n' "$serial ($model)" "$PACKAGE" >&2
    printf '  Il est signé par une clé EAS, le dev client par android/app/debug.keystore :\n' >&2
    printf '  les deux ne peuvent pas coexister. Pour le remplacer par le dev client :\n\n' >&2
    printf '      adb -s %s uninstall %s\n\n' "$serial" "$PACKAGE" >&2
    printf '  ⚠️ Cela efface les données de l'"'"'app sur cet appareil (session, préférences).\n' >&2
    case "$serial" in
        emulator-*) printf '  Sur un émulateur c'"'"'est sans conséquence.\n' >&2 ;;
        *)          printf '  Sur un téléphone, c'"'"'est le build du Play Store qui part —\n' >&2
                    printf '  il se réinstalle depuis le Store ensuite.\n' >&2 ;;
    esac
done

[ "$conflit" = 1 ] && exit 1
exit 0
