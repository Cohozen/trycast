---
name: trycast-design-system
description: Styler un écran ou composant TryCast avec le design system (tokens Tailwind v4 light/dark, primitives src/components/ui/, polices Anton/Inter, iconographie Lucide). À utiliser dès qu'on touche au style d'un écran, qu'on crée un composant UI, ou qu'on se demande quelle classe/couleur/police employer.
---

# TryCast — design system (Lot 5.5)

Source de vérité : `src/global.css` (tokens `@theme`) + le livrable Claude Design versionné dans `docs/design/` (maquettes HTML par écran, composants de référence dans `docs/design/project/_ds/…`). En cas de doute sur un rendu, **lire la maquette de l'écran** avant d'inventer.

## Identité (à ne jamais enfreindre)

- **Le grenat (`accent`, #E63E63) est une étincelle, jamais un fond** : CTA primaire, statut live, sélection active. Ne jamais en inonder un écran.
- Light = base **crème** (`bg` papier), dark = base **verte** (green-900/800). En dark, rester dans les tons verts — pas de blanc/crème pour les surfaces (le crème y est couleur de texte).
- Le rouge **danger** (#C4362B brique) est distinct du grenat : réservé à la destruction (suppression compte/ligue). Le grenat marque aussi l'erreur de saisie (bordure input).
- Fonds plats, pas de dégradés, pas d'emoji décoratifs. Ombres discrètes.

## Tokens → classes

- Couleurs sémantiques (basculent light/dark toutes seules via `light-dark()`) : `bg-bg`, `bg-surface`, `bg-surface-sunken`, `border-border`, `border-border-strong`, `text-text`, `text-text-muted`, `text-text-faint`, `bg-brand`/`text-on-brand`, `bg-accent`/`text-on-accent`, `bg-accent-press`, `bg-danger`/`text-on-danger`, `text-success`, `text-warning`, `text-info`, `bg-live`. Primitives dispo pour cas ciblés : `bg-green-700`, `bg-cream-100`, etc.
- Teintes translucides : modificateur d'opacité (`bg-accent/15`, `bg-text/10`) — compile en `color-mix`, OK natif + web.
- Radius : `rounded-xs|sm|md|lg|xl|pill` (6/10/14/20/28/999 px). Carte par défaut = `rounded-md`, boutons/chips = `rounded-pill`, sheets = `rounded-lg`.
- Ombres : classes dédiées `tc-shadow-sm|md|lg` et `tc-glow-accent` (PAS les `shadow-*` Tailwind : leurs variables composées passent mal en natif).
- Texte : `text-h1|h2|title|body|body-sm|data|caption|overline` (tailles + line-height px). `text-[Npx]` pour les valeurs ponctuelles des maquettes.
- Jamais de couleur Tailwind brute (`bg-blue-600`, `text-gray-500`) ni de hex en dur (exceptions documentées : logo/brand-mark, backdrop modal).

## Polices (piège natif)

`font-display` (Anton, 1 seule graisse) pour titres/scores/gros chiffres ; `font-body`, `font-body-medium`, `font-body-semibold`, `font-body-bold` (Inter) pour le reste. **En natif, `font-semibold` (poids CSS) ne change PAS la graisse d'une police custom** → toujours utiliser la famille dédiée. Chargées via `useFonts` dans `src/app/_layout.tsx` (`@expo-google-fonts/*`).

## Primitives (`src/components/ui/`)

`button` (primary/secondary/ghost/danger/danger-outline × sm/md/lg, loading, fullWidth), `icon-button` (solid/soft/ghost/outline), `text-field` (label, helper, error — bordure brand au focus, accent en erreur), `card`, `badge` (tones × solid/soft/outline, dot), `chip`, `segmented-control`, `skeleton` (line/block/circle), `toast` (liseré coloré, présentational), `empty-state` (titre Anton), `avatar` (initiales, ring accent), `screen` (scroll + max-w 800 centré).

- Press = **rétrécir** (`scale-[0.97]` boutons, 0.92 icon-buttons) + assombrir (`*-press`) — géré dans les primitives, ne pas réinventer.
- Composition conditionnelle : `cn()` de `src/tw/variants.ts` (clsx + tailwind-merge).
- Icônes : **lucide-react-native** (linéaire 2px, arrondi — conforme au DS). Couleur du trait via `useCSSVariable('--text')` (les icônes ne lisent pas `className`).
- Le symbole de marque = `src/components/brand-mark.tsx` (ne jamais redessiner).

## Thème light/dark

- Tout token sémantique bascule seul ; vérifier **chaque écran dans les deux thèmes**.
- Préférence manuelle : `src/features/profile/theme-preference.ts` (écran Réglages). Natif = `Appearance.setColorScheme` ; web = bascule des variables du polyfill lightningcss (`--lightningcss-light/dark`, « space toggle ») — ne pas toucher sans relire ce fichier.
- En dark, si un composant réfléchit du blanc (ex. verre de tab bar), retinter en `green-600/700` (consigne du livrable, `docs/design/project/CLAUDE.md`).

## Vérification

Bundling natif à tester tôt après tout changement de `global.css` (bug lightningcss connu, override épinglé) : `npx expo export --platform ios`. Puis parcours visuel light **et** dark (web : `npx expo start --web`, iOS : simulateur).
