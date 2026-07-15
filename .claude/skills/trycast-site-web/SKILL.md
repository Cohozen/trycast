---
name: trycast-site-web
description: Travailler sur le site vitrine Astro de TryCast (web/) — structure, tokens DS en CSS vanilla, commandes de vérification, preview navigateur et son piège de capture, formulaire waitlist (RPC join_waitlist, anti-spam SQL, tests E2E curl), déploiement Vercel. À consulter dès qu'on touche à web/, à la landing, aux pages légales ou à la waitlist.
---

# Site vitrine TryCast (`web/`)

Site **Astro statique** (pas d'adapter SSR) dans un sous-dossier autonome : son propre `package.json`, **pas de workspaces npm**. Le tsconfig racine et l'ESLint de l'app excluent `web` ; le formatage web reste couvert par Biome racine (`npx biome format web`).

## Structure

- `web/src/pages/` — `index.astro` (landing), `cgu.astro`, `confidentialite.astro`, `mentions-legales.astro`
- `web/src/layouts/` — `base-layout.astro` (SEO, polices, thème, nav+footer), `content-layout.astro` (pages légales, bandeau « premier jet » à retirer après validation)
- `web/src/components/` — un composant par fichier, kebab-case, sections de la landing + `ball-logo`/`team-flag`/`section-heading`
- `web/src/styles/tokens.css` — **copie** des tokens DS (custom properties, dark via `[data-theme='dark']`) ; source de vérité design : `docs/design/project/_ds/…/tokens/`. Piège : pas de `*/` dans un commentaire CSS (chemins avec glob → lightningcss casse en minify)
- Polices **self-hostées** via `@fontsource/anton` + `@fontsource/inter` (RGPD : pas de CDN Google Fonts). Thème posé par un script inline dans `<head>` selon `prefers-color-scheme`

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

Cible : Vercel, projet `trycast-web`, framework Astro (build baké avec les `PUBLIC_*`). Le connecteur Vercel de la session peut déployer (`deploy_to_vercel`, fichiers sources + `.env` dans l'arbre) **si** le droit de créer/écrire le projet est accordé — sinon 403 « You don't have permission to create a project » (action Corentin : ré-autoriser le connecteur ou créer le projet dans le dashboard).
