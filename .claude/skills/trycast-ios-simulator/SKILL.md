---
name: trycast-ios-simulator
description: Lancer, voir et piloter TryCast dans le simulateur iOS — dev build local (expo-dev-client), Metro, screenshots lisibles par Claude, arbre d'accessibilité, taps/saisie via AXe, navigation par deep link Expo Router. À utiliser dès qu'il faut vérifier visuellement un écran, tester un parcours dans l'app, ou reproduire un bug UI en conditions réelles.
---

# Piloter TryCast dans le simulateur iOS

Workflow validé le 10/07/2026 (Xcode 26.6, simulateurs iOS 26.5, AXe 1.7.1). L'app tourne dans un **dev build local** (`expo-dev-client`, bundle id `com.cohozen.trycast`), pas dans Expo Go. Tout se fait en CLI, aucune app MCP requise.

## Prérequis (déjà installés)

- **AXe** (`axe`) : CLI d'automatisation du simulateur — `brew tap cameroncooke/axe && brew trust cameroncooke/axe && brew install axe` (Homebrew ≥ 6 exige le `brew trust`)
- Simulateur de référence : **iPhone 17 Pro iOS 26.5**, UDID `EED53ED3-4ED6-496F-A3EE-E48BC94AA4A8` (si absent : `xcrun simctl list devices available`)

## Démarrage

**Prérequis one-shot** : le dev client doit être compilé et installé sur le simulateur. Si l'app `com.cohozen.trycast` n'est pas encore sur le simulateur (ou après un changement natif/plugin) : `npm run ios` (= `expo run:ios`) — prebuild + pod install + build Xcode + install + Metro. Nécessite **CocoaPods** (`brew install cocoapods`) et Xcode.

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
4. **Deep links Expo Router** : `xcrun simctl openurl booted "trycast://<route>"` (scheme natif du dev build ; ex. `league/join`, `settings`, `leaderboard`). ⚠️ Provoque un **rechargement complet du bundle** (~5-10 s de splash) avant d'arriver sur l'écran — attendre, puis vérifier par screenshot ou describe-ui. Limites constatées : un écran ouvert ainsi n'a **pas de pile derrière lui** (l'edge-swipe retour ne dépile rien) et le deep link vers la racine (`trycast://` sans chemin) **ne re-navigue pas** si l'app est déjà ouverte. Pour revenir à l'accueil de façon fiable : `xcrun simctl terminate booted com.cohozen.trycast && xcrun simctl openurl booted trycast://`.

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

## Pièges connus (vécus)

- **Clavier AZERTY** : si `axe type "TESTAXE1"` produit `TESTQXE&`, le clavier iOS actif est le français (AZERTY) — les keycodes HID d'AXe sont interprétés comme des positions QWERTY. ⚠️ Le correctif ne persiste **pas** de façon fiable (constaté le 10/07/2026 : AZERTY revenu sur le simulateur de référence) — **vérifier la première saisie de chaque session** (screenshot après `axe type`) et rejouer le correctif au besoin :
  ```bash
  xcrun simctl spawn booted defaults write .GlobalPreferences AppleKeyboards -array "en_US@sw=QWERTY;hw=Automatic" "emoji@sw=Emoji"
  xcrun simctl spawn booted launchctl stop com.apple.SpringBoard   # respring ~8 s, l'app doit être rouverte ensuite
  ```
  Il ne suffit PAS de mettre en_US en premier : il faut retirer le clavier français de la liste.
- **HMR** : après une édition de code, le dev build recharge tout seul (Fast Refresh) — pas besoin de relancer, juste re-screenshoter. Rechargement forcé : `r` impossible (Metro en background) → refaire `xcrun simctl openurl booted trycast://`.
- **describe-ui** pèse plusieurs centaines de Ko sur un écran chargé : toujours piper dans un filtre, jamais l'afficher brut.
- **Session** : l'app garde la session Supabase (compte perso `cohozen` connecté). Pour tester le flux auth, se déconnecter via Profil, puis utiliser les comptes seedés `e2e.user1@trycast.local` / `e2e.user2@trycast.local`, mot de passe `motdepasse123` (`scripts/seed-test-users.sql`, projet DEV uniquement). Ne pas se déconnecter sans raison : ça casse l'état de test de Corentin.
- **Prudence données** : les champs de score des matchs **auto-savent** dans la base dev — ne pas y taper de valeurs de test sans les remettre en l'état. Le champ « Code d'invitation » (`league/join`) est inoffensif tant qu'on ne soumet pas : c'est le bon endroit pour tester la saisie.
- **Tester light/dark** (vécu 11/07/2026) : la préférence de thème de l'app (Réglages > Thème, celle de Corentin = **Sombre**) **prime sur le système** — `xcrun simctl ui booted appearance light` ne change alors rien à l'app. Recette : Profil > engrenage (365,92) → segmenté Thème (Système (90,322) / Clair (201,322) / Sombre (311,322), coordonnées à reconfirmer via describe-ui) → vérifier les écrans → **remettre « Sombre » et l'appearance système `dark` avant de finir** (état de test de Corentin). Après un tap thème, un `axe button home` + `xcrun simctl openurl booted trycast://` peut rester sur le springboard : rejouer l'`openurl`.

## Nettoyage fin de session

Rien d'obligatoire. Éventuellement : tuer la tâche Metro, `xcrun simctl shutdown $UDID` si Corentin le demande.
