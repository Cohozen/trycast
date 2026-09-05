---
name: trycast-android-emulator
description: Lancer, voir et piloter TryCast dans l'émulateur Android — dev build local (expo-dev-client), Metro, screenshots lisibles par Claude, arbre d'accessibilité via uiautomator, taps/saisie via adb input, navigation par deep link Expo Router. À utiliser dès qu'il faut vérifier visuellement un écran sur Android, tester un parcours, ou reproduire un bug UI spécifique à Android.
---

# Piloter TryCast dans l'émulateur Android

Pendant du skill `trycast-ios-simulator`, côté Android. L'app tourne dans un **dev build local**
(`expo-dev-client`, paquet `com.cohozen.trycast`), pas Expo Go. Tout se fait en CLI via `adb`, aucune
app MCP requise.

Workflow validé le **2026-09-05** : émulateur **Pixel_10_Pro** (arm64-v8a, image `android-37.1`
Google APIs PlayStore, Android 17), JDK 17 Homebrew, Gradle 9.3.1, AGP compileSdk 36, NDK 27.1.

## Prérequis machine

- **JDK 17** : `brew install openjdk@17`. RN 0.86 déclare `jvmToolchain(17)` ; le JBR livré avec
  Android Studio est en **Java 25**, hors couloir supporté — ne pas s'en servir.
  ⚠️ Le cask `zulu@17` recommandé par la doc Expo installe un `.pkg` et exige un **mot de passe
  administrateur** : un agent ne peut pas l'installer, la formule `openjdk@17` fait le même travail
  sans sudo. Elle est *keg-only*, donc invisible pour `/usr/libexec/java_home` — `android-env.sh`
  va la chercher directement dans `/opt/homebrew/opt/openjdk@17/…`.
- **SDK Android** + AVD, via Android Studio. `cmdline-tools` n'est **pas** installé et n'est pas
  nécessaire : les licences sont acceptées et AGP télécharge seul les composants manquants.
- Ne rien exporter dans `~/.zshrc` : tout l'environnement vient de `scripts/android-env.sh`.

## Démarrage

```bash
npm run android:doctor     # JDK, SDK, AVD, appareils connectés — ne construit rien
npm run android:emulator   # démarre l'AVD et ATTEND sys.boot_completed
npm run android            # compile, installe le dev client, lance Metro
```

`npm run android` reste au premier plan (Metro) : le lancer en **tâche de fond** (`run_in_background`)
et suivre son fichier de sortie. Premier build : **15-25 min** (Gradle, AGP, NDK à télécharger),
ensuite 1-3 min. Attendre la ligne **`Android Bundled`** dans la sortie Metro — c'est *la* preuve que
le dev client parle bien à Metro.

Pour les commandes `adb` isolées, sourcer l'environnement à chaque appel — `adb` n'est pas dans le
`PATH` par défaut :

```bash
sh -c '. ./scripts/android-env.sh && adb shell …'
```

## ⚠️ Le piège central : release vs dev client

Un build **release** (EAS preview/production) et le **dev client** local sont signés par des clés
différentes. Conséquences :

- L'installation du dev client par-dessus un release échoue en `INSTALL_FAILED_UPDATE_INCOMPATIBLE`.
  Désinstaller d'abord : `adb uninstall com.cohozen.trycast` (perd la session et les préférences
  locales de ce build — le dire avant de le faire).
- **Un release ne se connecte JAMAIS à Metro** : il tourne sur son JS embarqué. L'app s'ouvre,
  s'utilise, et donne l'illusion parfaite d'un correctif qui ne prend pas. Symptôme : zéro
  `Android Bundled` dans la sortie Metro alors que l'app fonctionne. Piège vécu le 2026-09-05, sur
  lequel une session entière de vérification Android a été perdue.
- **Vérifier avant toute passe visuelle** que ce qui tourne est le dev client : le **FAB du menu
  développeur** (engrenage flottant) doit être visible, et une édition de code doit se propager
  toute seule par Fast Refresh.

## Les 4 canaux d'observation

### 1. Screenshot

```bash
adb exec-out screencap -p > <scratchpad>/ecran.png
```

Écran **1280 × 2856 px**, densité 480 (×3) → **426 × 952 dp**. L'image brute est trop lourde à lire
telle quelle : la réduire avant l'outil `Read`.

```bash
magick <scratchpad>/ecran.png -resize 33% <scratchpad>/ecran-lu.png
```

### 2. Arbre d'accessibilité (`uiautomator`)

Plus fiable qu'un screenshot pour vérifier du texte. Équivalent Android de `axe describe-ui`.

```bash
adb shell uiautomator dump /sdcard/ui.xml >/dev/null && adb shell cat /sdcard/ui.xml > <scratchpad>/ui.xml
```

Helper d'extraction (libellé + centre tappable, **en pixels**) :

```bash
python3 -c "
import re, xml.etree.ElementTree as ET
for n in ET.parse('<scratchpad>/ui.xml').iter('node'):
    lbl = n.get('text') or n.get('content-desc') or ''
    if not lbl and n.get('resource-id'): lbl = '#' + n.get('resource-id').split('/')[-1]
    if not lbl: continue
    x1, y1, x2, y2 = map(int, re.findall(r'-?\d+', n.get('bounds')))
    print(f\"{n.get('class').split('.')[-1]}: {lbl!r} center=({(x1+x2)//2},{(y1+y2)//2}) {'clickable' if n.get('clickable')=='true' else ''}\")
"
```

`text` porte le contenu, `content-desc` l'`accessibilityLabel` React Native. Le code ne pose
**aucun `testID`** aujourd'hui, donc `resource-id` est vide sur les vues de l'app : on sélectionne
par texte ou par libellé d'accessibilité.

### 3. Logs runtime

```bash
adb logcat -s ReactNativeJS:V          # console.log / erreurs JS
adb logcat -v time '*:E'               # erreurs natives (crash, TCC, FCM)
adb logcat -c                          # vider avant de reproduire un bug
```

La sortie Metro reçoit aussi les logs JS, mais `logcat` est le seul à voir le natif.

### 4. Deep links Expo Router

```bash
adb shell am start -a android.intent.action.VIEW -d "trycast://league/join"
```

Mêmes limites qu'en iOS : pas de pile de navigation derrière l'écran ouvert. Repartir propre :

```bash
adb shell am force-stop com.cohozen.trycast
adb shell monkey -p com.cohozen.trycast -c android.intent.category.LAUNCHER 1
```

## Interagir — coordonnées en PIXELS

⚠️ Différence majeure avec iOS : `axe` prend des **points logiques**, `adb input` prend des
**pixels**. Sur cet écran le facteur est **×3**. Les centres rendus par le helper ci-dessus sont
déjà en pixels, directement utilisables.

```bash
adb shell input tap 640 1470                       # tap
adb shell input swipe 640 1800 640 900 300         # swipe (dernier arg = durée ms)
adb shell input swipe 640 1470 640 1470 800        # appui long (même point, 800 ms)
adb shell input text "bonjour"                     # saisie (champ focus requis : tap d'abord)
adb shell input keyevent 67                        # 67 = retour arrière
adb shell input keyevent 4                         # 4 = bouton retour Android
```

`input text` n'accepte **ni espaces ni accents** directement : échapper les espaces (`%s`) et éviter
les accents. Après chaque interaction, vérifier (screenshot ou dump) — ne jamais enchaîner à l'aveugle.

## Pièges connus

- **`emulator` rend la main trop tôt** : la fenêtre s'ouvre bien avant que le système soit démarré,
  et `adb install` répond alors « device offline » ou échoue sans dire pourquoi. Toujours passer par
  `npm run android:emulator`, qui boucle sur `sys.boot_completed`.
- **Connexion Google impossible en local** : le dev build est signé par `android/app/debug.keystore`
  (keystore partagé du template Expo, SHA-1 fixe), et aucun client OAuth Android ne porte cette
  empreinte. « Continuer avec Google » donne un `DEVELOPER_ERROR`. Même piège que la clé Play App
  Signing. La connexion e-mail/mot de passe fonctionne normalement.
- **Session non acquise** : le projet Supabase de dev est neuf, l'app retombe volontiers sur l'écran
  de connexion. **Un agent ne saisit pas de mot de passe** — vérifier l'écran d'entrée par un
  screenshot *avant* de bâtir une passe visuelle, et le dire à Corentin si c'est la connexion.
- **`android/` est généré et gitignoré** : ne rien y éditer. `npx expo prebuild --clean -p android`
  le régénère, et `google-services.json` y est réinjecté par `app.config.ts`. Vérifier après coup que
  `android/app/google-services.json` est bien revenu.
- **Un nouveau config plugin n'est pas réappliqué sur un `android/` préexistant** (même piège qu'iOS,
  cf. `trycast-dev-builds`) : après tout ajout de dépendance native ou de plugin,
  `prebuild --clean` **avant** de rebuilder.
- **Prudence données** : les champs de score des matchs auto-savent dans la base **dev**. Ne pas y
  taper de valeurs de test sans les remettre en l'état. Le champ « Code d'invitation »
  (`trycast://league/join`) est inoffensif tant qu'on ne soumet pas.

## Nettoyage fin de session

Rien d'obligatoire. Éventuellement tuer la tâche Metro, et `adb emu kill` pour éteindre l'émulateur.
Le script démarre l'AVD en `-no-snapshot-save` : l'arrêt est instantané et le prochain démarrage
repart d'un état connu.
