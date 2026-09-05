#!/bin/sh
# Environnement Android pour les builds locaux (expo run:android) et l'émulateur.
#
# À SOURCER, pas à exécuter :  . ./scripts/android-env.sh
# npm exécute ses scripts via `sh`, qui ne source PAS ~/.zshrc : sans ce fichier,
# `npm run android` ne voit ni Java ni le SDK Android, même si le shell interactif
# de Corentin les connaît. Une seule source de vérité, déduite de la machine —
# même esprit que scripts/project-ref.mjs pour le ref Supabase.
#
# Surcharges possibles avant de sourcer :
#   ANDROID_HOME=…   emplacement du SDK      (défaut $HOME/Library/Android/sdk)
#   TRYCAST_AVD=…    nom de l'émulateur      (défaut Pixel_10_Pro)
#   JAVA_HOME=…      JDK à utiliser          (défaut : premier JDK 17 trouvé)

trycast_android_env_fail() {
    printf '\033[31m✖ %s\033[0m\n' "$1" >&2
    shift
    for line in "$@"; do printf '  %s\n' "$line" >&2; done
    return 1
}

# --- JDK 17 -----------------------------------------------------------------
# React Native 0.86 déclare `jvmToolchain(17)` et la doc Expo SDK 57 recommande
# un JDK 17. Le JBR d'Android Studio est en Java 25 : hors couloir supporté, on
# ne s'en sert PAS. On nomme donc le 17 explicitement au lieu de faire confiance
# au `java` du PATH.
if [ -z "$JAVA_HOME" ] || [ ! -x "$JAVA_HOME/bin/javac" ]; then
    # `|| true` : java_home sort en erreur quand il ne trouve rien, ce qui
    # tuerait un script appelant sous `set -e` avant le repli Homebrew.
    JAVA_HOME=$(/usr/libexec/java_home -v 17 2>/dev/null || true)

    # Homebrew installe openjdk@17 en keg-only : /usr/libexec/java_home ne le voit
    # pas tant qu'on ne l'a pas symlinké dans /Library (ce qui exige sudo). On le
    # cherche donc là où brew le pose réellement.
    if [ -z "$JAVA_HOME" ]; then
        for candidate in \
            /opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home \
            /usr/local/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home \
            /Library/Java/JavaVirtualMachines/zulu-17.jdk/Contents/Home
        do
            if [ -x "$candidate/bin/javac" ]; then JAVA_HOME=$candidate; break; fi
        done
    fi
fi

if [ -z "$JAVA_HOME" ] || [ ! -x "$JAVA_HOME/bin/javac" ]; then
    trycast_android_env_fail \
        'Aucun JDK 17 trouvé — Gradle ne peut pas démarrer.' \
        'Installer (sans mot de passe administrateur) :' \
        '' \
        '    brew install openjdk@17' \
        '' \
        "Le JBR d'Android Studio (Java 25) ne convient pas : React Native 0.86" \
        'déclare une toolchain 17.'
    return 1 2>/dev/null || exit 1
fi
export JAVA_HOME

# --- SDK Android ------------------------------------------------------------
: "${ANDROID_HOME:=$HOME/Library/Android/sdk}"
if [ ! -d "$ANDROID_HOME/platform-tools" ]; then
    trycast_android_env_fail \
        "SDK Android introuvable dans $ANDROID_HOME." \
        "Ouvrir Android Studio → Settings → Languages & Frameworks → Android SDK," \
        "ou pointer ailleurs :  ANDROID_HOME=/chemin/vers/sdk npm run android"
    return 1 2>/dev/null || exit 1
fi
export ANDROID_HOME
export ANDROID_SDK_ROOT="$ANDROID_HOME"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$PATH"

# --- local.properties -------------------------------------------------------
# android/ est gitignoré et régénéré par prebuild : ce fichier est un artefact,
# jamais du contenu de dépôt. ANDROID_HOME suffirait à AGP, mais l'écrire rend
# le dossier ouvrable tel quel dans Android Studio.
# Le fichier étant SOURCÉ, $0 vaut le nom du shell et non son chemin : on part
# donc du répertoire courant, que npm garantit être la racine du paquet.
TRYCAST_ROOT=$PWD
while [ ! -f "$TRYCAST_ROOT/package.json" ] && [ "$TRYCAST_ROOT" != / ]; do
    TRYCAST_ROOT=$(dirname "$TRYCAST_ROOT")
done
if [ -d "$TRYCAST_ROOT/android" ]; then
    printf 'sdk.dir=%s\n' "$ANDROID_HOME" > "$TRYCAST_ROOT/android/local.properties"
fi
unset TRYCAST_ROOT

# --- Architecture native ----------------------------------------------------
# android/gradle.properties en déclare quatre (armeabi-v7a, arm64-v8a, x86,
# x86_64) parce que les builds EAS visent tous les téléphones. En local, la
# machine comme l'émulateur Pixel_10_Pro sont en arm64 : compiler les trois
# autres quadruple le temps de build pour rien. Gradle lit ORG_GRADLE_PROJECT_<x>
# comme propriété de projet, donc sans toucher au fichier généré.
export ORG_GRADLE_PROJECT_reactNativeArchitectures="${ORG_GRADLE_PROJECT_reactNativeArchitectures:-arm64-v8a}"

# --- Émulateur --------------------------------------------------------------
export TRYCAST_AVD="${TRYCAST_AVD:-Pixel_10_Pro}"
