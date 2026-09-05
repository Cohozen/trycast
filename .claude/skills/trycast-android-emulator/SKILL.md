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
et suivre son fichier de sortie. Attendre la ligne **`Android Bundled`** dans la sortie Metro —
c'est *la* preuve que le dev client parle bien à Metro.

Durées mesurées le 2026-09-05, machine M-series : **5 min 30 de Gradle** au premier build (663 tâches,
arm64 seul), plus le téléchargement initial de Gradle 9.3.1 et des composants SDK manquants
(AGP a installé seul `build-tools 35` et la plateforme `android-36`, sans `cmdline-tools`) — une
vingtaine de minutes bout en bout. Ensuite 1-3 min.

**Au premier lancement**, le dev client affiche son panneau d'accueil par-dessus l'app. Son bouton
`Continue` ouvre le **menu développeur complet** au lieu de fermer le panneau : sortir avec
`adb shell input keyevent 4` (retour Android).

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

### Le corollaire : un dev client peut AUSSI tourner sur un bundle embarqué

Piège vécu le 2026-09-05, distinct du précédent et plus sournois — le paquet installé était bien
le dev client (`flags=[ DEBUGGABLE … ]`, engrenage flottant présent), mais il avait été **lancé
avec le mauvais lien** :

```bash
adb shell am start -a android.intent.action.VIEW -d "trycast://" com.cohozen.trycast   # ❌ ouvre l'app sur son JS embarqué
```

Ce lien ouvre l'app sans jamais lui dire **où** est Metro : elle sert son bundle embarqué, tout
fonctionne, et les modifications de code n'arrivent jamais. Le lien correct passe l'URL de Metro
au dev client :

```bash
adb reverse tcp:8081 tcp:8081
adb shell am force-stop com.cohozen.trycast
adb shell am start -a android.intent.action.VIEW \
  -d "trycast://expo-development-client/?url=http%3A%2F%2Flocalhost%3A8081" com.cohozen.trycast
```

**Le seul critère fiable reste `Android Bundled` dans la sortie Metro** — ni le flag DEBUGGABLE,
ni l'engrenage flottant, ni le fait que l'app s'affiche correctement ne prouvent quoi que ce soit.
Vérifier **avant** de mesurer :

```bash
grep -c "Android Bundled" <fichier-de-sortie-metro>   # 0 = l'app n'est PAS sur ton code
```

### Toute comparaison avant/après exige un témoin positif

Corollaire méthodologique du piège ci-dessus. Une mesure du type « 0 pixel de différence entre
avant et après » a **deux** explications : le rendu est vraiment identique, ou bien **rien n'a été
rechargé**. Les deux sont indiscernables sur le résultat.

Avant de conclure quoi que ce soit d'un avant/après sur Android, faire tourner un **témoin
positif** : appliquer un changement statique volontairement énorme (déplacer une géométrie de
plusieurs unités, changer une taille) et vérifier que la capture bouge. Si le témoin ne bouge pas,
toutes les mesures de la passe sont nulles et non avenues — pas seulement douteuses.

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
par texte ou par libellé d'accessibilité. Le FAB du menu développeur apparaît sous
`ImageView: 'Tools'` (~1154, 282 px) — c'est lui, pas un élément de l'app.

Sortie réelle sur l'écran de connexion, pour donner l'échelle :

```
TextView:  'TryCast'                     center=(639,528)
Button:    'Continuer avec Google'       center=(640,1039)  clickable
EditText:  'toi@exemple.fr'              center=(640,1395)  clickable
EditText:  'Ton mot de passe'            center=(601,1652)  clickable
Button:    'Se connecter'                center=(640,1929)  clickable
```

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
- **Le Fast Refresh ne recharge PAS les fichiers de locale** (vécu 2026-09-05). Modifier une chaîne
  dans `src/locales/fr/*.json` ne change rien à l'écran : i18next initialise son magasin de
  ressources une fois pour toutes au démarrage, et remplacer le module JSON ne le réinitialise pas.
  Le JSX, lui, se recharge parfaitement (vérifié de bout en bout). Piège trompeur : on croit le dev
  client cassé alors qu'il fonctionne. Pour voir un changement de traduction, recharger l'app
  (menu développeur → `Reload`, ou `adb shell am force-stop com.cohozen.trycast` puis relance).
- ⚠️ **Ne jamais démarrer l'AVD avec `-no-snapshot-save`** (erreur commise et corrigée le
  2026-09-05). Le drapeau ne « repart pas d'un état propre » : il **jette la session entière** et
  rebascule sur le dernier instantané. Effet vécu — le dev client installé le matin avait disparu
  au redémarrage, l'émulateur avait retrouvé son build release du 3 septembre (`firstInstallTime`
  inchangé, aucun flag `DEBUGGABLE`), et le `npm run android` suivant échouait en
  `INSTALL_FAILED_UPDATE_INCOMPATIBLE` **après cinq minutes de Gradle**. Le Quick Boot par défaut
  sauvegarde à l'extinction, ce qui est exactement ce qu'on veut. Pour un vrai démarrage à froid,
  c'est `-no-snapshot-load`, et ça se demande explicitement.
- **Le conflit de signature est détecté avant Gradle** par `scripts/android-preflight.sh`, branché
  dans `npm run android` : il nomme l'appareil fautif et affiche la commande de désinstallation,
  sans jamais la jouer (gratuit sur un émulateur, coûteux sur le téléphone de Corentin, où c'est le
  build du Play Store qui partirait). Discriminant utilisé : un build de debug porte le drapeau
  `DEBUGGABLE` dans `dumpsys package`, un build de release non.
- **Prudence données** : les champs de score des matchs auto-savent dans la base **dev**. Ne pas y
  taper de valeurs de test sans les remettre en l'état. Le champ « Code d'invitation »
  (`trycast://league/join`) est inoffensif tant qu'on ne soumet pas.

## Nettoyage fin de session

Rien d'obligatoire. Éventuellement tuer la tâche Metro, et `adb emu kill` pour éteindre l'émulateur.
Le Quick Boot sauvegarde l'état à l'extinction : le dev client installé est toujours là au prochain
démarrage.
