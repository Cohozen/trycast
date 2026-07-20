---
name: trycast-site-web
description: Travailler sur le site vitrine Astro de TryCast (web/) — structure, tokens DS en CSS vanilla, commandes de vérification, preview navigateur et son piège de capture, formulaire waitlist (RPC join_waitlist, anti-spam SQL, tests E2E curl), déploiement Vercel. À consulter dès qu'on touche à web/, à la landing, aux pages légales ou à la waitlist.
---

# Site vitrine TryCast (`web/`)

Site **Astro statique** (pas d'adapter SSR) dans un sous-dossier autonome : son propre `package.json`, **pas de workspaces npm**. Le tsconfig racine et l'ESLint de l'app excluent `web` ; le formatage web reste couvert par Biome racine (`npx biome format web`).

## Structure

- `web/src/pages/` — `index.astro` (landing), `cgu.astro`, `confidentialite.astro`, `mentions-legales.astro`
- `web/src/layouts/` — `base-layout.astro` (SEO, polices, thème, nav+footer), `content-layout.astro` (pages légales ; validées le 2026-07-20, éditeur anonyme LCEN 6-III-2, contact `contact@trycast.fr` — à revoir au passage commercial/App Store)
- `web/src/components/` — un composant par fichier, kebab-case, sections de la landing + `ball-logo`/`team-flag`/`section-heading`
- `web/src/styles/tokens.css` — **copie** des tokens DS (custom properties, dark via `[data-theme='dark']`) ; source de vérité design : `docs/design/project/_ds/…/tokens/`. Piège : pas de `*/` dans un commentaire CSS (chemins avec glob → lightningcss casse en minify)
- Polices **self-hostées** via `@fontsource/anton` + `@fontsource/inter` (RGPD : pas de CDN Google Fonts). Thème posé par un script inline dans `<head>` selon `prefers-color-scheme`

## Piège majeur : découverte tsconfig de rolldown (build cassé en CI/Vercel)

La découverte automatique de tsconfig de vite/rolldown (Astro 7) **escalade au-dessus de `web/`** : un module `.astro` (ou un id à query `?astro…`) ne matche l'`include` d'aucun tsconfig (seuls .ts/.tsx, ou .js avec `allowJs`, matchent), donc la découverte continue vers le parent et **parse le tsconfig racine du repo** (`extends expo/tsconfig.base`). Sans `node_modules` racine (CI web, Vercel, clone frais avec install web seulement) : `Tsconfig not found expo/tsconfig.base`. En local ça passe car les deps racine sont installées.

Correctifs en place (2026-07-15) :
- `web/astro.config.mjs` : `resolve.tsconfigPaths: false` (aucun alias TS — coupe l'escalade côté resolver)
- Scripts client en **`.js` dans `web/src/scripts/`** (jamais de `<script>` TS inline : un `.js` matche le tsconfig de `web/` via `allowJs` et l'escalade s'arrête)
- Le **transform natif** (`builtin:vite-transform`) escalade quoi qu'il arrive (aucune option ne l'arrête — `oxc.tsconfig`/`rollupOptions.tsconfig` inopérants et absents des types) → on rend le tsconfig racine **parseable** avec un stub `node_modules/expo/tsconfig.base.json` = `{}` : step dédié dans `.github/workflows/web.yml` + `installCommand` de `web/vercel.json`
- Reproduire en local : `mv node_modules/expo/tsconfig.base.json{,.bak}` puis `cd web && npm run build` (remettre le fichier après)

## Vérification

```bash
cd web && npm run check && npm run build   # astro check + build
```

CI dédiée `.github/workflows/web.yml` (paths `web/**`) ; `ci.yml` (app) ignore `web/**`.

## Preview navigateur

`preview_start` avec la config `site-web` (port 4321, `.claude/launch.json`). **Piège capture** : après un scroll (action scroll, ancre, `window.scrollTo`), la capture d'écran du panneau rend une page vide alors que le DOM est sain. Contournement : rester à `scrollY = 0` et translater la page — `document.body.style.transform = 'translateY(-900px)'` — puis remettre `''` à la fin. Un reload répare aussi la capture.

## Waitlist

- Migration `supabase/migrations/20260715000100_waitlist.sql` : tables `waitlist_signups` / `waitlist_attempts` (RLS **sans policy** : zéro accès client direct), RPC `join_waitlist(email)` security definer exécutable par `anon`
- Anti-spam **côté SQL** : rate limit 3/h/IP (IP via `current_setting('request.headers')` → `x-forwarded-for`), plafond global 100/h, purge >24 h à chaque appel, **refus toujours silencieux** (void, 204) — anti-énumération. Honeypot côté formulaire (champ `website` : rempli ⇒ succès simulé sans appel réseau)
- Piège plpgsql : `on conflict (email)` est ambigu avec le paramètre → cibler `on conflict on constraint waitlist_signups_email_key`
- Env : `web/.env` (`PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_KEY`, modèle `.env.example`) ; le formulaire appelle PostgREST en fetch direct, sans supabase-js

Test E2E rapide :

```bash
source web/.env
curl -s -o /dev/null -w '%{http_code}' -X POST "$PUBLIC_SUPABASE_URL/rest/v1/rpc/join_waitlist" \
  -H "apikey: $PUBLIC_SUPABASE_KEY" -H "Authorization: Bearer $PUBLIC_SUPABASE_KEY" \
  -H 'Content-Type: application/json' -d '{"email":"test@trycast.fr"}'   # → 204 toujours
```

Vérifier l'insert côté serveur (MCP `execute_sql` sur `waitlist_signups`), puis **purger les données de test** (`truncate public.waitlist_signups; truncate public.waitlist_attempts;`). Le select PostgREST direct sur ces tables doit répondre 401/permission denied.

## Déploiement

Vercel, projet créé par Corentin (2026-07-15), **branché sur le repo GitHub avec Root Directory `web`** : chaque push sur `main` rebuilde le site — c'est **la** voie de déploiement. Le `installCommand` de `web/vercel.json` (stub tsconfig, voir piège ci-dessus) est indispensable. Les `PUBLIC_*` sont bakées au build (env vars Vercel côté dashboard, ou `.env` non versionné en local). Le connecteur Vercel de Claude **ne voit pas ce projet** (`list_projects` vide — autre scope) : ne pas tenter `deploy_to_vercel` (risque de créer un projet parallèle), passer par un commit + push (accord de Corentin requis pour le push).
