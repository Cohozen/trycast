---
name: trycast-design-system
description: Styler un écran ou composant TryCast avec le design system (tokens Tailwind v4 light/dark, primitives src/components/ui/, polices Anton/Inter, iconographie Lucide). À utiliser dès qu'on touche au style d'un écran, qu'on crée un composant UI, ou qu'on se demande quelle classe/couleur/police employer.
---

# TryCast — design system (Lot 5.5, tokens v2)

Source de vérité : `src/global.css` (tokens `@theme`) + le livrable Claude Design versionné dans `docs/design/` (maquettes HTML par écran, composants de référence dans `docs/design/project/_ds/…`). En cas de doute sur un rendu, **lire la maquette de l'écran** avant d'inventer.

## Identité (à ne jamais enfreindre)

- **Le grenat (`accent`, #E63E63) est une étincelle, jamais un fond** : CTA primaire, statut live, sélection active. Ne jamais en inonder un écran.
- **Surfaces = neutres chauds** (DS v2) : light = base **sable/blanc** (`bg` #FAF8F4, `surface` blanc), dark = base **charbon chaud** (`bg`/`surface` charbon, PAS vert). Le **vert est la MARQUE** (`brand` — vert foncé en light, `green-400` #43A56E lisible en dark : logo, avatars, icônes discrètes), pas un fond plein cadre. Ne jamais teinter une surface en vert « à la main ».
- Le rouge **danger** (#C4362B brique) est distinct du grenat : réservé à la destruction (suppression compte/ligue). Le grenat marque aussi l'erreur de saisie (bordure input).
- Fonds plats, pas de dégradés, pas d'emoji décoratifs. Ombres discrètes.

## Tokens → classes

- Couleurs sémantiques (basculent light/dark toutes seules via `light-dark()`) : `bg-bg`, `bg-surface`, `bg-surface-sunken`, `border-border`, `border-border-strong`, `text-text`, `text-text-muted`, `text-text-faint`, `bg-brand`/`text-on-brand`, `bg-accent`/`text-on-accent`, `bg-accent-press`, `bg-danger`/`text-on-danger`, `text-success`, `text-warning`, `text-info`, `bg-live`. Primitives (legacy `green-*`/`cream-*`/`ink-*`/`grenat-*`) exposées pour cas ciblés — mais préférer les tokens sémantiques ; les surfaces neutres v2 (sable/charbon) sont couvertes par `bg`/`surface`/`surface-sunken`/`border`. La TabBar flottante teinte sa pastille active dark en `bg-accent/15 border-accent/30` (grenat), plus de vert.
- Teintes translucides : modificateur d'opacité (`bg-accent/15`, `bg-text/10`) — compile en `color-mix`, OK natif + web.
- Radius : `rounded-xs|sm|md|lg|xl|pill` (6/10/14/20/28/999 px). Carte par défaut = `rounded-md`, boutons/chips = `rounded-pill`, sheets = `rounded-lg`.
- Ombres : classes dédiées `tc-shadow-sm|md|lg` et `tc-glow-accent` (PAS les `shadow-*` Tailwind : leurs variables composées passent mal en natif).
- Texte : `text-h1|h2|title|body|body-sm|data|caption|overline` (taille px + line-height). **Piège natif** : les `--text-*--line-height` de `global.css` doivent rester des **ratios sans unité** (react-native-css résout `line-height: var(…)` au runtime en multipliant le nombre par la taille de police — une valeur `22px` y devient le multiplicateur 22 et éclate les lignes sur toute la hauteur de l'écran). `text-[Npx]` (+ `leading-[Npx]`, littéral OK) pour les valeurs ponctuelles des maquettes.
- Jamais de couleur Tailwind brute (`bg-blue-600`, `text-gray-500`) ni de hex en dur (exceptions documentées : logo/brand-mark, backdrop modal).

## Polices (piège natif)

`font-display` (Anton, 1 seule graisse) pour titres/scores/gros chiffres ; `font-body`, `font-body-medium`, `font-body-semibold`, `font-body-bold` (Inter) pour le reste. **En natif, `font-semibold` (poids CSS) ne change PAS la graisse d'une police custom** → toujours utiliser la famille dédiée. Chargées via `useFonts` dans `src/app/_layout.tsx` (`@expo-google-fonts/*`).

## Primitives (`src/components/ui/`)

`button` (primary/secondary/ghost/danger/danger-outline × sm/md/lg, loading, fullWidth), `icon-button` (solid/soft/ghost/outline), `text-field` (label, helper, error — bordure brand au focus, accent en erreur), `card`, `badge` (tones × solid/soft/outline, dot), `chip`, `segmented-control`, `skeleton` (line/block/circle), `toast` (liseré coloré, présentational), `empty-state` (titre Anton), `avatar` (initiales, ring accent), `screen` (scroll + max-w 800 centré), `section-label` (label majuscule de section d'écran, variante danger — utilisé par Réglages et Règles du jeu).

- Press = **rétrécir** (`scale-[0.97]` boutons, 0.92 icon-buttons) + assombrir (`*-press`) — géré dans les primitives, ne pas réinventer. **Piège react-native-css** : une classe ajoutée conditionnellement au press dont l'utility compile en variable CSS (`scale-*` → `--tw-scale-*`, `shadow-*` → `--tw-shadow`…) fait basculer le statut « porteur de variables » du composant après le premier rendu → react-native-css le démonte/remonte (état perdu + warning `added or removed a variable`). Parade : la classe runtime `will-change-variable` (fournie par react-native-css, pas par Tailwind, inerte sur web) dans les classes **de base** du `Pressable` — déjà en place dans `button`, `icon-button`, `chip`.
- **Marges d'écran** : jamais de `pt-14`/`pb-32` en dur — `useScreenInsets()` de `@/tw/use-screen-insets` (`top` sous la barre d'état, `bottomTabBar` au-dessus de la tab bar flottante ; planchers = anciennes valeurs fixes). Valeurs runtime → prop `style`/`contentContainerStyle`, pas en className. **Piège react-native-css** : hors cible `style`, une prop inline écrase le style dérivé des classes (ex. `contentContainerStyle` vs `contentContainerClassName`) — le wrapper `ScrollView` de `@/tw` fait la fusion lui-même ; pour toute autre cible mappée, ne pas mélanger classes et inline sans vérifier.
- Composition conditionnelle : `cn()` de `src/tw/variants.ts` (clsx + tailwind-merge).
- **Piège `border-dashed` (vécu 2026-07-16)** : posé sur un conteneur qui a des enfants, react-native-css **propage le borderStyle aux bordures des descendants** (cartes/boutons rendus en pointillés). Un séparateur pointillé vit dans **sa propre `View` sans enfants** ; et iOS ne rend le dashed que si la **largeur de bordure est uniforme sur les 4 côtés** → recette : `<View className="h-0 overflow-hidden border border-dashed border-border-strong" />` (un `border-t` seul redevient plein). Exemple : zone de danger de `league/[id].tsx`.
- Icônes : **lucide-react-native** (linéaire 2px, arrondi — conforme au DS). Couleur du trait via `useThemeColor('text')` de `@/tw` (les icônes ne lisent pas `className` ; `useCSSVariable` a été supprimé — il retournait `undefined` en natif). Même hook pour `placeholderTextColor` et les spinners.
- Le symbole de marque = `src/components/brand-mark.tsx` (ne jamais redessiner).
- **Animations = Reanimated 4** (`react-native-worklets` déjà en place, React Compiler compatible, aucun rebuild ni config babel — auto par `babel-preset-expo`). Idiomes du repo : shimmer `skeleton.tsx`, entrées `Keyframe` d'`animated-icon.tsx`, **pastille coulissante « magic pill »** — tab bar (`app-tabs.tsx`, `withSpring` amorti) et contrôle segmenté (`ui/segmented-control.tsx`, `withTiming` ease-out, sans rebond). Recette pastille : élément **unique** animé (`translateX`+`width`) dont la **géométrie est mesurée par `onLayout`** de chaque item (pas de calcul gap/padding) ; pose sans glissé au 1er rendu (ref `firstPlacement`) ; **toujours respecter `useReducedMotion()`** (bascule instantanée). **Pièges** : (1) jamais de `className` sur `Animated.View` (react-native-css ne l'interope pas) → animer en `style` et poser les tokens sur une `View` enfant ; (2) **pas d'`interpolateColor` avec `useThemeColor`** — il renvoie une `var()` CSS non interpolable sur web → pour un fondu de couleur thème-correct, **cross-fade d'opacité** de deux couches empilées (couleur via `className`), robuste natif + web.

## Thème light/dark

- Tout token sémantique bascule seul ; vérifier **chaque écran dans les deux thèmes**.
- **Contrainte native** : react-native-css n'enregistre pas les variables `:root`/`@theme` au runtime — chaque `--color-*` de `global.css` doit rester un hex littéral ou `light-dark(hex, hex)` **sans `var()` interne** (sinon la branche dark ne se résout pas en natif). Les mêmes hex vivent dans `src/tw/palette.ts` pour le JS ; `palette.test.ts` casse la CI si les deux fichiers divergent — toute retouche de couleur se fait donc **dans les deux fichiers**.
- **Contrainte browserslist** : `light-dark()` ne marche en natif que s'il **survit** à la passe Lightning CSS d'`@expo/metro-config`, dont les cibles viennent du champ `browserslist` de `package.json`. Le plancher (Chrome 123 / Safari 17.5 / Firefox 120 = support natif de `light-dark()`) ne doit jamais baisser ni disparaître — sinon chaque token est réécrit en « space toggle » `var(--lightningcss-*)` irrésoluble par react-native-css et **toute l'app reste en light, silencieusement**.
- Préférence manuelle : `src/features/profile/theme-preference.ts` (écran Réglages). Natif = `Appearance.setColorScheme` ; web = propriété `color-scheme` posée/retirée en inline sur `:root` (pilote `light-dark()` nativement) — ne pas toucher sans relire ce fichier.
- En dark, si un composant réfléchit du blanc (ex. verre de tab bar), retinter en `green-600/700` (consigne du livrable, `docs/design/project/CLAUDE.md`).

## Vérification

Bundling natif à tester tôt après tout changement de `global.css` (bug lightningcss connu, override épinglé) : `npx expo export --platform ios`. Puis parcours visuel light **et** dark (web : `npx expo start --web`, iOS : simulateur).
