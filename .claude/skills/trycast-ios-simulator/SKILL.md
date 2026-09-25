---
name: trycast-ios-simulator
description: Lancer, voir et piloter TryCast dans le simulateur iOS — dev build local (expo-dev-client), Metro, screenshots lisibles par Claude, arbre d'accessibilité, taps/saisie via AXe, navigation par deep link Expo Router. À utiliser dès qu'il faut vérifier visuellement un écran, tester un parcours dans l'app, ou reproduire un bug UI en conditions réelles.
---

# Piloter TryCast dans le simulateur iOS

> **Toutes les commandes de ce skill se lancent depuis `apps/mobile`** (le projet Expo), et les chemins relatifs (`android/`, `ios/`, `scripts/…`, `app.json`) s'y rapportent. Seules exceptions : `supabase` et `bash scripts/e2e-*.sh`, à la racine.

Workflow validé le 10/07/2026 (Xcode 26.6, simulateurs iOS 26.5, AXe 1.7.1). L'app tourne dans un **dev build local** (`expo-dev-client`, bundle id `com.cohozen.trycast`), pas dans Expo Go. Tout se fait en CLI, aucune app MCP requise.

## Prérequis (déjà installés)

- **AXe** (`axe`) : CLI d'automatisation du simulateur — `brew tap cameroncooke/axe && brew trust cameroncooke/axe && brew install axe` (Homebrew ≥ 6 exige le `brew trust`)
- Simulateur de référence : **iPhone 17 Pro iOS 26.5**, UDID `EED53ED3-4ED6-496F-A3EE-E48BC94AA4A8` (si absent : `xcrun simctl list devices available`)

## Démarrage

**Prérequis one-shot** : le dev client doit être compilé et installé sur le simulateur. Si l'app `com.cohozen.trycast` n'est pas encore sur le simulateur (ou après un changement natif/plugin) : `npm run ios` (= `expo run:ios`) — prebuild + pod install + build Xcode + install + Metro. Nécessite **CocoaPods** (`brew install cocoapods`) et Xcode.

⚠️ **Deux pièges de rebuild vécus le 2026-07-13** (ajout de `expo-image-picker`/`-manipulator` + config plugin) :
- **CocoaPods exige UTF-8** : `pod install` casse avec `Unicode Normalization not appropriate for ASCII-8BIT` si la locale du shell n'est pas UTF-8. Lancer le build avec `LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 npx expo run:ios …`.
- **Un nouveau config plugin n'est PAS ré-appliqué sur un `ios/` préexistant** : `expo run:ios` fait un prebuild non destructif → les clés Info.plist du plugin (ex. `NSPhotoLibraryUsageDescription`) manquent → **crash TCC** (« attempted to access privacy-sensitive data without a usage description ») dès qu'on touche la ressource. Après tout ajout de dépendance native/plugin : `npx expo prebuild --clean -p ios` (ou supprimer `ios/`) **avant** `expo run:ios`. Vérifier : `grep NSPhotoLibraryUsageDescription ios/trycast/Info.plist`.

Ensuite, une fois le dev client installé :

```bash
UDID=EED53ED3-4ED6-496F-A3EE-E48BC94AA4A8
xcrun simctl boot "$UDID"        # erreur "Unable to boot ... current state: Booted" = déjà booté, OK
open -a Simulator                # optionnel (Claude n'en a pas besoin, utile si Corentin regarde)
npx expo start --ios --port 8081 # EN TÂCHE DE FOND (Bash run_in_background) — ouvre le dev build
```

Attendre que la sortie Metro contienne `iOS Bundled` (boucle `until grep -q "iOS Bundled" <fichier-output>` en background — jamais de `sleep` long en avant-plan). Si Metro tourne déjà, ouvrir l'app avec `xcrun simctl openurl booted trycast://`.

## Les 4 canaux d'observation

1. **Screenshot** (le « voir ») : `xcrun simctl io booted screenshot <scratchpad>/nom.png` puis outil **Read** sur le PNG. Écran logique **402×874 pt**, image 1206×2622 px (échelle ×3).
2. **Arbre d'accessibilité** (le « snapshot DOM », plus fiable qu'un screenshot pour vérifier du texte) : `axe describe-ui --udid $UDID` → JSON très verbeux, **toujours filtrer** (voir helper ci-dessous). ⚠️ L'arbre inclut le contenu **hors écran** des ScrollView : un `y > 874` n'est pas tappable tel quel, il faut scroller d'abord.
3. **Logs runtime** : la sortie Metro (fichier output de la tâche de fond) reçoit les `console.log`/erreurs JS de l'app.
4. **Deep links Expo Router** : `xcrun simctl openurl booted "trycast://<route>"` (scheme natif du dev build ; ex. `league/join`, `settings`, `leaderboard`). ⚠️ Provoque un **rechargement complet du bundle** (~5-10 s de splash) avant d'arriver sur l'écran — attendre, puis vérifier par screenshot ou describe-ui. Limites constatées : un écran ouvert ainsi n'a **pas de pile derrière lui** (l'edge-swipe retour ne dépile rien) et le deep link vers la racine (`trycast://` sans chemin) **ne re-navigue pas** si l'app est déjà ouverte. Pour revenir à l'accueil de façon fiable : `xcrun simctl terminate booted com.cohozen.trycast && xcrun simctl openurl booted trycast://`. ⚠️ Après un `terminate`, l'`openurl` peut retomber sur le **launcher du dev client** (écran « Development Build ») au lieu de charger le bundle : retapper la ligne du serveur (`axe tap -x 200 -y 190`), attendre ~12 s, puis rejouer le deep link voulu (vécu 2026-07-13).

Helper pour extraire les éléments et leurs centres tappables :

```bash
axe describe-ui --udid $UDID | python3 -c "
import json,sys
def walk(n):
    lbl = n.get('AXLabel')
    if lbl and n.get('type') != 'Group':
        f = n['frame']
        print(f\"{n.get('type')}: {lbl!r} center=({int(f['x']+f['width']/2)},{int(f['y']+f['height']/2)})\")
    for c in n.get('children') or []: walk(c)
for r in json.load(sys.stdin): walk(r)
"
```

## Manipuler l'état local AsyncStorage (forcer un état pour tester)

Certaines features dépendent d'un flag device-local (`@react-native-async-storage/async-storage`) qu'on ne peut pas atteindre par l'UI — ex. l'overlay de célébration (`trycast.celebrated-matches.<userId>`, **une clé par compte** depuis le 2026-09-22), qui n'apparaît qu'avec un « déjà vu » dans un état précis. On peut **éditer le stockage à la main** pour reproduire le cas (vécu 2026-07-18) :

```bash
DATA=$(xcrun simctl get_app_container booted com.cohozen.trycast data)
MANIFEST="$DATA/Library/Application Support/com.cohozen.trycast/RCTAsyncLocalStorage_V1/manifest.json"
```

- Le backend iOS est un **`manifest.json`** (objet `{cléAsyncStorage: valeurString}`) ; les petites valeurs y sont inline (les >1024 car. partent dans des fichiers séparés du même dossier). La **session Supabase n'y est pas** (elle vit dans `expo-secure-store` via `LargeSecureStore`) — éditer ce fichier ne déconnecte pas.
- **Terminer l'app d'abord** (`xcrun simctl terminate booted com.cohozen.trycast`), sinon un flush au prochain flush/exit écrase l'édition.
- **Ne modifier que sa clé** (relire le JSON, changer une entrée, réécrire) pour préserver `trycast.theme-preference` & co. Sauver un `.bak` par prudence, le retirer à la fin.
- Relancer (`openurl`, cf. piège launcher ci-dessous) et vérifier. Beaucoup de features **auto-cicatrisent** : le « Fermer/valider » réécrit la clé dans son état correct — vérifier le manifest après pour le confirmer, et laisser l'état de Corentin propre.

## Interagir (coordonnées en points logiques, PAS en pixels)

```bash
axe tap -x 246 -y 819 --udid $UDID      # tap (tab bar : Matchs≈(65,819) Résultats≈(155,819) Classement≈(246,819) Profil≈(336,819))
axe type "texte" --udid $UDID            # saisie clavier (champ focus requis — tap d'abord). US ASCII uniquement, pas d'accents
axe key 42 --udid $UDID                  # touche par keycode HID (42 = delete/backspace ; boucler pour vider un champ)
axe swipe --start-x 200 --start-y 600 --end-x 200 --end-y 300 --udid $UDID   # scroll vers le bas
axe button home --udid $UDID             # boutons hardware
axe help <sous-commande>                 # aide détaillée
```

Après chaque interaction : `sleep 1-2` puis vérifier (screenshot ou describe-ui). Ne jamais enchaîner à l'aveugle.

## Données de démonstration

Pour une passe visuelle ou des captures, rejouer d'abord `node --no-warnings scripts/seed-demo.mjs`
(à la racine) : les matchs fictifs sont calés sur l'heure d'exécution, et le script imprime le deep
link de chaque cas. Corentin se connecte en `hugo@demo.trycast.local` — un agent ne saisit pas le
mot de passe. Le rejeu **garde** les comptes (la session reste valide) mais recrée ligues et matchs
fictifs sous de nouveaux ids : reprendre les liens de la dernière sortie, et s'attendre au récap
« Depuis ta dernière visite » à l'ouverture suivante (le fermer par « Fermer »).

## Pièges connus (vécus)

- **Outil simulateur intégré, limites constatées le 2026-09-19** : son `screenshot` peut
  échouer en `captureFailed` et `inspect` être indisponible. Repli qui marche :
  `xcrun simctl io booted screenshot <png>` puis `magick -resize 33%` avant de lire.
  Son action `text` passe par un clavier **matériel** : le clavier logiciel ne s'affiche
  pas, donc un comportement « au-dessus du clavier » ne se vérifie pas ici (le faire sur
  l'émulateur Android). Un toast (2,2 s) se rate facilement : enchaîner plusieurs captures
  juste après l'action.

- **AXe cassé depuis Xcode 27** (vécu le 2026-09-18) : toute commande `axe` échoue en
  `Failed to load essential private frameworks … Developer/Library/PrivateFrameworks/SimulatorKit.framework`
  — Xcode 27 a déplacé SimulatorKit dans `Contents/SharedFrameworks`. En attendant une version
  d'AXe compatible, piloter par l'**outil simulateur intégré** de Claude Code
  (`mcp__Claude_Code_iOS_Simulator__control` : `screenshot`, `tap` avec `duration` pour un appui
  long, `swipe`, `inspect`), en points logiques comme AXe. `simctl` (screenshot, openurl) marche toujours.
  Toujours le cas le 2026-09-24 (passes faites par `screenshot` et `tap`, `inspect` indisponible).
  ⚠️ **Le sous-agent `verif-visuelle` n'a pas cet outil** (ses outils : Bash, Read, Grep, Glob,
  Skill) : sous Xcode 27, une passe iOS qui doit taper ou faire défiler se fait depuis la session
  principale ; le sous-agent ne peut que capturer par `simctl` et ouvrir des deep links.

- **`npm run ios` exige un certificat de développement Apple valide sur ce Mac**, même pour le
  simulateur (liens d'invitation et Sign in with Apple). Installé le 2026-09-24, expire en
  septembre 2027. « No code signing certificates are available » = certificat absent, expiré ou
  sans l'intermédiaire WWDR G3 : diagnostic, correctif et repli `xcodebuild` dans le skill
  `trycast-dev-builds`, section iOS.
- **Sign in with Apple au simulateur** : sans Apple ID dans les Réglages du simulateur, la feuille
  renvoie une erreur générique (code 1000), et c'est attendu. Avec un Apple ID connecté et un build
  signé de `npm run ios`, la feuille s'ouvre mais la saisie du mot de passe Apple ID ne mène nulle
  part (vécu le 2026-09-25, bug connu du simulateur). Au simulateur, on vérifie le rendu du bouton
  et l'ouverture de la feuille ; le parcours complet se teste sur iPhone en TestFlight (détail dans
  `trycast-dev-builds`).
- **Tester un lien d'invitation sans liens universels** (inertes dans un build signé en local, sans
  entitlements) : utiliser
  `xcrun simctl openurl booted "trycast:///rejoindre/<CODE>"`, **avec trois barres obliques**. Avec
  deux, `rejoindre` devient l'hôte de l'URL et non son chemin : `+native-intent` n'y reconnaît pas
  d'invitation, et l'app affiche « Unmatched Route ». Ce n'est pas un bug : seule la forme
  `https://www.trycast.fr/rejoindre/<CODE>` circule. Le chemin nu passe par la même réécriture
  (vérifié le 2026-09-11 : code pré-rempli et aperçu de la ligue affiché). Choisir un code qui existe
  dans la base de dev, sinon « Code d'invitation invalide » est la bonne réponse.

- **Les deep links successifs empilent les écrans** (vécu le 2026-09-22) : un `openurl` vers un écran déjà ouvert ne recharge pas toujours le bundle, et la pile garde les écrans précédents. Un `router.push` vers la même route peut alors **réutiliser** une instance déjà consommée (focus déjà fait, état figé) : le comportement observé ne dit rien d'une ouverture fraîche. Pour une mesure qui compte, repartir d'une pile propre (`terminate` puis `openurl`, cf. le piège du launcher), et tester aussi le chemin « retour puis réouverture ».
- **L'overlay de célébration peut s'ouvrir après un seed** : des points posés en base sur un prono de l'utilisateur connecté le déclenchent au lancement suivant. Il se ferme par « Fermer » en bas de l'écran. Un breakdown sans `winnerCorrect` y affiche « Raté » à côté de points positifs : c'est le seed qui est incohérent, pas l'app.
- **Clavier AZERTY** : si `axe type "TESTAXE1"` produit `TESTQXE&`, le clavier iOS actif est le français (AZERTY) — les keycodes HID d'AXe sont interprétés comme des positions QWERTY. ⚠️ Le correctif ne persiste **pas** de façon fiable (constaté le 10/07/2026 : AZERTY revenu sur le simulateur de référence) — **vérifier la première saisie de chaque session** (screenshot après `axe type`) et rejouer le correctif au besoin :
  ```bash
  xcrun simctl spawn booted defaults write .GlobalPreferences AppleKeyboards -array "en_US@sw=QWERTY;hw=Automatic" "emoji@sw=Emoji"
  xcrun simctl spawn booted launchctl stop com.apple.SpringBoard   # respring ~8 s, l'app doit être rouverte ensuite
  ```
  Il ne suffit PAS de mettre en_US en premier : il faut retirer le clavier français de la liste.
- **Clavier logiciel absent au focus d'un champ** (vécu 2026-07-14) : le tap prend bien le focus (curseur visible) mais aucun clavier n'apparaît et `keyboardWillShow` ne se déclenche jamais (donc pas d'escamotage de la tab bar, pas d'ajustement de scroll) — le simulateur croit qu'un **clavier matériel** est connecté. Correctif : `defaults write com.apple.iphonesimulator ConnectHardwareKeyboard -bool false` **puis redémarrer le simulateur** (quit Simulator.app + `simctl shutdown`/`boot` — le réglage n'est lu qu'au démarrage ; l'écrire à chaud ne suffit pas). ⚠️ Réglage global de Simulator.app côté host, laissé à `false` pour les tests : si Corentin veut retaper au clavier Mac dans le simulateur, ⇧⌘K (I/O > Keyboard > Connect Hardware Keyboard).
- **HMR** : après une édition de code, le dev build recharge tout seul (Fast Refresh) — pas besoin de relancer, juste re-screenshoter. Rechargement forcé : `r` impossible (Metro en background) → refaire `xcrun simctl openurl booted trycast://`.
- **describe-ui** pèse plusieurs centaines de Ko sur un écran chargé : toujours piper dans un filtre, jamais l'afficher brut.
- **Engrenage flottant en haut à droite sur TOUS les écrans de l'app** (investigué le 2026-07-13) : ce n'est **pas un bug de l'app** — c'est le **FAB du menu développeur d'expo-dev-menu** (`Image: label='gearshape.fill'` dans describe-ui, ~(361,116) pt), rendu dans sa **propre UIWindow** au-dessus de tout (il chevauche même les headers natifs). Dev builds uniquement, absent en release. Ne pas le confondre avec le bouton Réglages du Profil (`Button: 'Réglages'`, icône Lucide). Masquable si besoin : menu dev (« Show floating action button », préférence `EXDevMenuShowFloatingActionButton`) — ne pas le désactiver sans demander, c'est un réglage du device de test.
- **Session : ne plus la supposer acquise** (corrigé le 2026-09-05). Le simulateur gardait la session Supabase du compte `cohozen` ; depuis la scission dev/prod du 2026-09-03, l'app vise un projet de dev **neuf**, et le simulateur retombe sur l'écran de connexion. **Un agent ne saisit pas de mot de passe** — vérifier l'écran d'entrée par un screenshot **avant** de bâtir toute une passe visuelle, et si c'est la connexion, le dire à Corentin et attendre qu'il se connecte lui-même. Pour tester le flux auth une fois connecté, se déconnecter via Profil ; les comptes seedés `e2e.user1@trycast.local` / `e2e.user2@trycast.local` (`scripts/seed-test-users.sql`, projet DEV uniquement) n'existent que si le seed a été rejoué sur le nouveau projet. Ne pas se déconnecter sans raison : ça casse l'état de test de Corentin.
- **Un `swipe` peut ouvrir le menu développeur** par-dessus l'écran (vécu 2026-09-05) : panneau « TOOLS / Open DevTools / Toggle element inspector… ». Il se ferme par son bouton `Close` (repérable dans `describe-ui`) ; si l'écran reste pollué, un `xcrun simctl openurl booted trycast://<route>` repart propre.
- **Vérifier une dimension se fait en la mesurant, pas à l'œil** : `xcrun simctl io booted screenshot`, puis `magick <png> -crop <w>x<h>+<x>+<y> +repage txt:-` et un filtre couleur en Python sur la sortie donne la boîte englobante exacte d'un élément coloré (a servi à prouver qu'un anneau d'avatar faisait bien 56 × 56 pt après correctif). Rappel d'échelle : iPhone 17 Pro = 402 × 874 pt pour 1206 × 2622 px, soit ×3.
- **Prudence données** : les champs de score des matchs **auto-savent** dans la base dev — ne pas y taper de valeurs de test sans les remettre en l'état. Le champ « Code d'invitation » (`league/join`) est inoffensif tant qu'on ne soumet pas : c'est le bon endroit pour tester la saisie.
- **Tester light/dark** (vécu 11/07/2026) : la préférence de thème de l'app (Réglages > Thème, celle de Corentin = **Sombre**) **prime sur le système** — `xcrun simctl ui booted appearance light` ne change alors rien à l'app. Recette : Profil (336,819) > engrenage (365,92) → segmenté Thème (Système (90,478) / Clair (201,478) / Sombre (311,478), confirmées le 17/07/2026 — la section Compte a grandi depuis les anciennes coordonnées y=322) → vérifier les écrans → **remettre « Sombre » et l'appearance système `dark` avant de finir** (état de test de Corentin). Après un tap thème, un `axe button home` + `xcrun simctl openurl booted trycast://` peut rester sur le springboard : rejouer l'`openurl`. **Écrans d'auth en clair** : le thème se règle par appareil et survit à la déconnexion, donc passer en « Clair » **avant** de se déconnecter (manqué le 2026-09-24 : l'écran de connexion n'a été vu qu'en sombre).

## Nettoyage fin de session

Rien d'obligatoire. Éventuellement : tuer la tâche Metro, `xcrun simctl shutdown $UDID` si Corentin le demande.
