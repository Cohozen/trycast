# TryCast — Design System

**TryCast** is a free, social **rugby prediction app** for playing with friends (francophone, target: **Rugby World Cup 2027**, soft-launch on the **6 Nations 2027**). One prediction per match (exact score + offensive bonus), points weighted by bookmaker odds, league and global rankings. 100% free and social.

This design system holds the brand foundations, tokens, and reusable UI components (React + CSS custom properties) needed to build TryCast interfaces. The production app targets **Expo + React Native + TypeScript + NativeWind (Tailwind v4)** — everything here is expressible in RN primitives + NativeWind classes (no web-only effects).

## Sources

- **Brand kit (provided):** `uploads/trycast-brand-logo.html` (logo system), `uploads/trycast-colors.ts` (color tokens), `uploads/trycast-symbol.svg`, `uploads/trycast-app-icon.svg`. Logo assets copied into `assets/`.
- **Product repo (for context):** `Cohozen/trycast` on GitHub — https://github.com/Cohozen/trycast . *Not read this pass — GitHub was not authorized. Reconnect via the Import menu to enrich copy/tone and screen structure from the real product; browse it to build higher-fidelity screens.*

The brief was to build the **design system foundations + components** — not app screens yet ("pas encore les écrans"), so no UI kit was produced. See **Caveats**.

---

## Content fundamentals

- **Language:** French, familiar register. TryCast talks to you with **tutoiement** ("ton prono", "reviens", "tu vises juste") — like a mate, never a corporation.
- **Tone:** warm, direct, low-drama. Short sentences. Rugby-literate but never gatekeeping.
- **Casing:** sentence case for UI copy; Anton display type is naturally uppercase-feeling but content strings stay sentence case ("Aucun match à venir", not "AUCUN MATCH À VENIR"). Overlines/labels use uppercase with wide tracking ("TON PRONO", "LIVE").
- **Numbers:** always tabular (`font-variant-numeric: tabular-nums`) — scores, points and ranks must align in columns.
- **Emoji:** avoid. National flag emoji are the *only* acceptable exception (international fixtures) and even then `TeamFlag` abbreviations are preferred. No decorative emoji.
- **Vocabulary:** "prono" (prediction), "ligue", "classement", "journée", "coup d'envoi", "essai", "bonus offensif".
- **Examples:** "Valider mon prono" (CTA) · "Prono enregistré · France 24 – 18 Irlande" (toast) · "Reviens à l'ouverture du prochain 6 Nations." (empty state).

## Visual foundations

- **Colors.** Bottle-green (`#14432A`) is the identity and the surface color in dark theme; cream (`#F1EBDD`) is the paper in light theme; warm-black ink (`#16130E`) is text. **Grenat (`#E63E63`) is a spark, never a fill** — reserved strictly for CTAs, the live status, the selected/active tab, and the chosen prediction. Never flood a screen with grenat. Two full themes: **light (cream base)** and **dark (green base)**, switched via `[data-theme="dark"]`.
- **Type.** **Anton** (single weight, condensed) for display: scores, hero numbers, screen/section titles. **Inter** (400–700) for everything else: body, UI, labels, and tabular data. Scale runs display 56 → H1 32 → H2 22 → title 17 → body 15 → caption 12 → overline 11.
- **Spacing.** 4px base grid (4, 8, 12, 16, 24, 32, 48, 64). Mobile hit targets never below 44px.
- **Radii.** Soft and friendly: sm 10, md 14 (default card), lg 20 (sheets), xl 28, pill for buttons/chips/badges.
- **Shadows.** Low and warm (tinted with the ink color, not pure black in light theme). Three levels (sm/md/lg) plus one **grenat glow** reserved for the live/selected spark.
- **Backgrounds.** Flat color fields — cream or green. No gradients on surfaces (the sole gradient is the app-icon's radial green glow). No photographic imagery, no textures, no hand-drawn illustration. The comet/ball symbol is the one graphic motif.
- **Motion.** Quick and physical: `--dur-fast` 120ms for presses, `--dur` 200ms for state changes, `--ease-out` cubic-bezier(0.22,1,0.36,1). Press states **shrink** (scale 0.92–0.97). The only looping animation is the live-status pulse and skeleton shimmer.
- **Hover/press.** Press = scale-down + darker accent (grenat.600). Ghost/soft controls tint with a low-alpha `color-mix` of the text color. No opacity-only hovers on primary actions.
- **Borders.** Hairline `--border` (cream.200 / green.700). Selected states swap border to grenat; live match card gets a grenat-tinted border + glow.
- **Cards.** Surface background, hairline border, `--radius-md`, `--shadow-sm`. Elevation is subtle — this is a mobile product, not a web dashboard.
- **Transparency/blur.** Used sparingly via `color-mix` tints for soft badges, chips, and highlight rows. No heavy glassmorphism.
- **Imagery vibe.** Warm, editorial, minimal. Team identity is shown by **abbreviation + accent band** (`TeamFlag`), never club logos.

## Iconography

- **Style:** linear, 2px stroke, rounded caps/joins, 24px grid — a single coherent outline set. Active/selected icons bump stroke weight (\~2.4px) rather than switching to a filled variant.
- **Delivery:** icons are inline SVG drawn in this style within components and cards (the codebase uses RN vector icons; a matching outline set such as **Lucide** — https://lucide.dev — is the recommended CDN substitute and matches the stroke/cap conventions). Flag the substitution if you adopt Lucide wholesale.
- **Brand mark:** the "passe vissée" symbol (`assets/trycast-symbol.svg`) and app icon (`assets/trycast-app-icon.svg`) are real assets — use them, never redraw them.
- **Emoji / unicode as icons:** avoided (see Content fundamentals). National flag emoji are the only tolerated exception.

---

## Components

React components, styled entirely with the CSS custom properties from `styles.css`. Import via `const { X } = window.<Namespace>` in card HTML (run `check_design_system` for the namespace).

**Core** (`components/core/`): `Button`, `IconButton`, `Input`, `Chip`, `Badge`, `Avatar`, `SegmentedControl`, `LeagueSelector`, `Skeleton` **Navigation** (`components/navigation/`): `Header`, `TabBar`, `DateSelector` (match-day strip) **Feedback** (`components/feedback/`): `Toast`, `EmptyState` **Rugby — the core** (`components/rugby/`): `MatchCard`, `ScorePrediction` (+ `BonusToggle`), `ScoreStepper`, `RankingRow`, `CompetitionBadge`, `TeamFlag`

Each component ships a `.jsx` implementation, a `.d.ts` props contract, and a `.prompt.md` usage note. `Button`, `MatchCard`, `ScorePrediction`, and `RankingRow` are also exposed as **Starting Points**.

## Index (root manifest)

- `styles.css` — global entry point (consumers link this). `@import`s all tokens + fonts.
- `tokens/` — `colors.css` (light + dark themes), `typography.css` (scale + Anton/Inter), `spacing.css` (spacing, radii, shadows, motion), `fonts.css` (Anton + Inter via Google Fonts).
- `components/` — core / navigation / feedback / rugby (see above). One `@dsCard` HTML per group.
- `guidelines/` — foundation specimen cards (Colors, Type, Spacing, Brand) shown in the Design System tab.
- `assets/` — `trycast-symbol.svg`, `trycast-app-icon.svg`, `trycast-colors.ts` (original token reference).
- `SKILL.md` — Agent-Skill wrapper for reuse in Claude Code.

## Caveats

- **No UI kit / screens** were built — the brief explicitly scoped this to foundations + components ("pas encore les écrans"). Ask if you want full-screen recreations (match feed, prediction flow, leaderboard, profile) next.
- **Fonts load from Google Fonts CDN** (`@import` in `tokens/fonts.css`), so no `@font-face` binaries are shipped — the compiler reports "Fonts: none" for that reason. Provide `.ttf`/`.woff2` files if you want self-hosted fonts.
- **GitHub repo not read** (unauthorized) — copy/tone and screen structure could be sharpened against the real product once reconnected.
