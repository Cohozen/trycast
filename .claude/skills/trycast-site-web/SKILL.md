---
name: trycast-site-web
description: Travailler sur le site vitrine Astro de TryCast (apps/web/) — structure, bilingue FR/EN (dictionnaires typés, table des routes, pages légales jumelles, atterrissages autoLocale), tokens DS en CSS vanilla, commandes de vérification, preview navigateur et son piège de capture, formulaire waitlist (RPC join_waitlist, anti-spam SQL, tests E2E curl), page /rejoindre et .well-known/ des liens d'invitation, déploiement Vercel. À consulter dès qu'on touche à apps/web/, à la landing, à un texte du site, aux pages légales, à la waitlist ou à la vérification des domaines (assetlinks, AASA).
---

# Site vitrine TryCast (`apps/web/`)

Site **Astro statique** (pas d'adapter SSR) dans un sous-dossier autonome, voisin de l'app (`apps/mobile/`) : son propre `package.json` et son lock, **pas de workspaces npm**. Le formatage reste couvert par le Biome de la racine (`npm ci` à la racine, puis `npx biome format apps/web`).

## Structure

- `apps/web/src/pages/` — `index.astro` (landing FR), `cgu.astro`, `confidentialite.astro`, `mentions-legales.astro`, `suppression-compte.astro`, `rejoindre.astro`, `app/*` ; `en/` porte l'anglais (`index`, `terms`, `privacy`, `legal-notice`, `delete-account`)
- `apps/web/src/i18n/` — dictionnaires `fr.ts` (source) / `en.ts`, table `routes` et `legalUpdatedAt` dans `index.ts` (voir « Bilingue FR/EN »)
- `apps/web/src/layouts/` — `base-layout.astro` (SEO, hreflang, polices, thème, nav+footer, `autoLocale`), `content-layout.astro` (pages légales ; validées le 2026-07-20, éditeur anonyme LCEN 6-III-2, contact `contact@trycast.fr` — à revoir au passage commercial/App Store)
- `apps/web/src/components/` — un composant par fichier, kebab-case, sections de la landing (composées par `landing-page.astro`, rendu par `/` et `/en/`) + `ball-logo`/`team-flag`/`section-heading`/`language-switcher`
- `apps/web/src/styles/tokens.css` — **copie** des tokens DS (custom properties, dark via `[data-theme='dark']`) ; source de vérité design : `docs/design/project/_ds/…/tokens/`. ⚠️ **Cette copie ne se met pas à jour toute seule et aucun test ne la surveille** : une mise à jour des tokens du DS se répercute à **trois** endroits (`apps/mobile/src/global.css`, `apps/mobile/src/tw/palette.ts` — verrouillés ensemble par `palette.test.ts` — et ce fichier, qui reste orphelin). Vécu le 2026-09-04 : la rampe dark du site avait une version de retard sur l'app. Le site n'a pas besoin des primitives legacy `cream-*`/`mist-300`, il ne les utilise pas. Piège : pas de `*/` dans un commentaire CSS (chemins avec glob → lightningcss casse en minify)
- Polices **self-hostées** via `@fontsource/anton` + `@fontsource/inter` (RGPD : pas de CDN Google Fonts). Thème posé par un script inline dans `<head>` selon `prefers-color-scheme`

## Bilingue FR/EN (2026-09-11)

Français à la racine, anglais sous `/en/` (`i18n` d'`astro.config.mjs`, `prefixDefaultLocale: false`) : **aucune URL française n'a bougé**, et ce sont elles que connaissent l'app (`apps/mobile/src/lib/urls.ts`), l'allow-list Supabase, les liens d'invitation et `.well-known/`. Pas de dépendance : des dictionnaires TS.

- **Aucune chaîne en dur.** Un texte va dans `fr.ts` **et** `en.ts` ; `en` est typé `Dictionary = typeof fr`, donc une clé oubliée casse `astro check` (`ts(2741)`, prouvé). Un composant lit `getDictionary(toLocale(Astro.currentLocale))`. Listes en **objets à clés** : les données non traduites (icônes SVG) restent dans le composant et s'y rattachent par clé
- **Texte enrichi** : découper en `before` / `strong` / `after` plutôt que `set:html`, et écrire `{t.before}<b>{t.strong}</b>{t.after}` **sur une ligne** (piège `compressHTML` ci-dessous)
- **Nouvelle page traduite** = une entrée dans `routes` (slug par langue), puis `route="…"` passé au layout : c'est ce qui active le sélecteur et les `hreflang` (forme à barre finale, comme la canonique). Pas de redirection selon le navigateur, décision actée
- **Pages légales** : un fichier par langue (la prose n'a rien à faire dans un dictionnaire). **Le français fait foi** ; l'anglais porte un encart qui y renvoie. Date commune dans `legalUpdatedAt`, formatée par `Intl` (`en-GB`). Modifier une page légale = modifier sa jumelle dans le même commit ; `scripts/check-legal-parity.mjs` (lancé par `npm run check`) compare le nombre de `<h2>` et de `<li>` — il attrape une section ou une donnée ajoutée d'un seul côté, pas une phrase changée
- **Atterrissages à URL unique** (`/rejoindre/<code>`, `/app/confirme`, `/app/email-modifie`) : pas de `/en/` possible (URL construite par l'app, allow-list Supabase). Le layout reçoit `autoLocale={{ fr: titre, en: titre }}`, la page rend chaque langue dans un `<div data-locale>` (`display: contents`, la nav sticky tient) et le script du `<head>` pose `html[lang]` avant le premier paint : `en` si `navigator.language` l'est, `fr` sinon — même règle que l'app. `?lang=en|fr` force (sélecteur, recette). Sans JS : français. L'aperçu social reste en français
- Voix anglaise : tutoiement familier, vocabulaire rugby britannique, **libellés d'écrans repris de `apps/mobile/src/locales/en/`** (Settings → Privacy → Export my data, Leagues → Join, Log in…) — une page qui guide dans l'app doit citer ses vrais boutons
- Vignette OG anglaise : `og-default-en.png`, même script `scripts/build-og-images.sh` (il réécrit aussi les PNG FR : identiques au pixel, seules les métadonnées changent — `git checkout` les deux autres)
- Recette : `/en/`, puis sélecteur aller-retour ; `/rejoindre?c=GRP8XTQ5&lang=en` et `&lang=fr` ; le navigateur du panneau est en `fr`. Le `scroll-behavior: smooth` du site rend `window.scrollTo` asynchrone : passer `{ behavior: 'instant' }` pour mesurer après défilement, et pas de `requestAnimationFrame` quand le panneau est masqué (il ne se déclenche pas)

## Piège : `compressHTML` colle les mots aux balises inline

`compressHTML` (actif par défaut chez Astro) supprime le retour à la ligne qui précède une balise inline : un texte coupé juste avant `<strong>`/`<a>` s'affiche **collé** en production (`parSupabase`, `écris àcontact@trycast.fr`) — invisible dans le source, bien réel à l'écran. Garder le dernier mot **sur la même ligne** que la balise ouvrante (`… hébergées\npar <strong>Supabase</strong>`), jamais la balise seule en début de ligne. Prettier ne reformate pas les `.astro` (pas de plugin à la racine), donc la mise en forme tient.

Détection sur le build : `grep -roE '[a-zà-ÿ)]<(strong|a |em|code)[^>]*>' apps/web/dist/` — doit ne rien renvoyer (4 occurrences corrigées le 2026-07-21 sur `confidentialite.astro`).

## Piège majeur : découverte tsconfig de rolldown — aucun tsconfig au-dessus du site

La découverte automatique de tsconfig de vite/rolldown (Astro 7) **escalade au-dessus de `apps/web/`** : un module `.astro` (ou un id à query `?astro…`) ne matche l'`include` d'aucun tsconfig (seuls .ts/.tsx, ou .js avec `allowJs`, matchent), donc la découverte continue vers les dossiers parents et **parse le premier tsconfig qu'elle y trouve**.

Tant que l'app Expo occupait la racine du dépôt, c'était le sien (`extends expo/tsconfig.base`) : sans `node_modules` racine (CI web, Vercel), le build tombait en `Tsconfig not found expo/tsconfig.base`, et un stub `node_modules/expo/tsconfig.base.json` le rendait parseable. **Depuis le passage en `apps/` (2026-09-15), il n'y a plus de tsconfig à la racine, et le stub est retiré** de `web.yml` comme de `vercel.json`.

- ⚠️ **Règle : jamais de `tsconfig.json` à la racine du dépôt ni dans `apps/`.** Il suffirait à recasser le build du site. Vérifié par un témoin le 2026-09-15 : un `tsconfig.json` racine qui étend `expo/tsconfig.base` refait échouer `npm run build` (`TSCONFIG_ERROR`), son retrait le fait passer. `apps/mobile/tsconfig.json` est un voisin, pas un parent : il n'est pas concerné
- `apps/web/astro.config.mjs` : `resolve.tsconfigPaths: false` (aucun alias TS — coupe l'escalade côté resolver)
- Scripts client en **`.js` dans `apps/web/src/scripts/`** (jamais de `<script>` TS inline : un `.js` matche le tsconfig de `apps/web/` via `allowJs` et l'escalade s'arrête)
- Le **transform natif** (`builtin:vite-transform`) escalade quoi qu'il arrive : aucune option ne l'arrête (`oxc.tsconfig`/`rollupOptions.tsconfig` sont inopérants et absents des types). C'est ce qui rend la règle ci-dessus indispensable

## Vérification

```bash
cd apps/web && npm run check && npm run build   # astro check + parité des pages légales + build
```

CI dédiée `.github/workflows/web.yml` (paths `apps/web/**`) ; `ci.yml` (app) ignore `apps/web/**`.

## Preview navigateur

`preview_start` avec la config `site-web` (port 4321, `.claude/launch.json`). **Piège capture** : après un scroll (action scroll, ancre, `window.scrollTo`), la capture d'écran du panneau rend une page vide alors que le DOM est sain. Contournement : rester à `scrollY = 0` et translater la page — `document.body.style.transform = 'translateY(-900px)'` — puis remettre `''` à la fin. Un reload répare aussi la capture.

**Mesurer après le chargement des polices** : juste après un `navigate`/reload, Anton et Inter ne sont pas encore appliquées et le layout de repli est ~5× plus haut (`scrollHeight` 12 800 au lieu de 2 400) → la position calculée envoie la translation dans le vide et la capture ressort noire. Toujours `await document.fonts.ready` avant de lire un `getBoundingClientRect()`, ou recalculer si `scrollHeight` paraît aberrant.

## Waitlist

- Migration `supabase/migrations/20260715000100_waitlist.sql` : tables `waitlist_signups` / `waitlist_attempts` (RLS **sans policy** : zéro accès client direct), RPC `join_waitlist(email)` security definer exécutable par `anon`
- Anti-spam **côté SQL** : rate limit 3/h/IP (IP via `current_setting('request.headers')` → `x-forwarded-for`), plafond global 100/h, purge >24 h à chaque appel, **refus toujours silencieux** (void, 204) — anti-énumération. Honeypot côté formulaire (champ `website` : rempli ⇒ succès simulé sans appel réseau)
- Piège plpgsql : `on conflict (email)` est ambigu avec le paramètre → cibler `on conflict on constraint waitlist_signups_email_key`
- Env : `apps/web/.env` (`PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_KEY`, modèle `.env.example`) ; le formulaire appelle PostgREST en fetch direct, sans supabase-js

Test E2E rapide :

```bash
source apps/web/.env
curl -s -o /dev/null -w '%{http_code}' -X POST "$PUBLIC_SUPABASE_URL/rest/v1/rpc/join_waitlist" \
  -H "apikey: $PUBLIC_SUPABASE_KEY" -H "Authorization: Bearer $PUBLIC_SUPABASE_KEY" \
  -H 'Content-Type: application/json' -d '{"email":"test@trycast.fr"}'   # → 204 toujours
```

Vérifier l'insert côté serveur (MCP `execute_sql` sur `waitlist_signups`), puis **purger les données de test** (`truncate public.waitlist_signups; truncate public.waitlist_attempts;`). Le select PostgREST direct sur ces tables doit répondre 401/permission denied.

## Liens d'invitation : `/rejoindre/<CODE>`

Côté app (`buildInviteUrl()`, les quatre répliques de l'URL, `+native-intent.tsx`, invitation en
attente, partage) : skill `trycast-liens-invitation`.

Le site est **statique** : pas de `getStaticPaths` possible sur un code arbitraire. Une page
unique `apps/web/src/pages/rejoindre.astro` est servie pour `/rejoindre/:code` par un `rewrite` de
`vercel.json`, et le code est lu **côté client** depuis le chemin (repli sur `?c=` — c'est ce
repli qui permet de tester en `npm run dev`, où le rewrite Vercel n'existe pas).

L'aperçu est **générique**, et doit le rester : afficher le nom de la ligue imposerait d'ouvrir
`preview_league` aux requêtes anonymes (elle est `grant execute … to authenticated`) et donc
d'exposer le nom de n'importe quelle ligue à qui détient un code, robots d'aperçu compris. Ce
serait aussi un passage en SSR, donc un adapter Vercel.

### `.well-known/` — généré, jamais versionné

`scripts/build-well-known.mjs` (lancé en `prebuild`) écrit `assetlinks.json` et
`apple-app-site-association` à partir de `ANDROID_CERT_FINGERPRINTS` et `APPLE_TEAM_ID`, variables
du projet Vercel. Sans elles, **rien n'est écrit** et le build passe quand même — un fichier
d'attente serait pire, la vérification échouant alors sans que rien ne le signale.

`ANDROID_CERT_FINGERPRINTS` : des **SHA-256**, 32 octets hexadécimaux séparés par des deux-points
(95 caractères chacune). Le séparateur entre empreintes est indifférent — virgule, espace ou
retour à la ligne — précisément pour qu'une copie brute de la Play Console, qui les affiche sur
des lignes distinctes, fonctionne sans reformatage. Une valeur mal
formée **arrête le build** : c'est délibéré, le cas courant étant une **SHA-1** (40 caractères)
prise pour une SHA-256 — les deux se suivent dans la Play Console, et c'est la SHA-1 que réclament
les clients OAuth. Les empreintes à réunir sont celles des trois certificats de *Intégrité de
l'application → Signature de l'application* (signature actuelle, précédente, importation), plus
celle du build de test si l'on veut vérifier avant la prod. Pour un build local de debug :
`keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android | grep SHA256`.

⚠️ **Ordre des opérations** : le fichier doit être **en ligne avant** l'installation du build qui
déclare les liens. Android vérifie `autoVerify` au moment de l'installation ; si le fichier
manque alors, la vérification échoue et n'est retentée que plus tard, sans rien signaler.

### Contrôler le déploiement (recette du 2026-09-09)

Tout se vérifie depuis un terminal, sans attendre le build de l'app :

```bash
# Le fichier, son Content-Type, et surtout le NOMBRE d'empreintes
curl -s https://www.trycast.fr/.well-known/assetlinks.json | python3 -c "
import json,sys
fps = json.load(sys.stdin)[0]['target']['sha256_cert_fingerprints']
print(len(fps), 'empreinte(s)'); [print(' ', f) for f in fps]"

# Le rewrite : la page doit répondre 200 avec un code dans le chemin
curl -s -o /dev/null -w '%{http_code}\n' https://www.trycast.fr/rejoindre/GRP8XTQ5

# Les balises d'aperçu sur l'URL réelle, og:image en absolu
curl -sL https://www.trycast.fr/rejoindre/GRP8XTQ5 | grep -oE '<meta property="og:image"[^>]*>'

# Le site anglais (2026-09-11) : pages en 200, hreflang croisés, URL françaises intactes
for p in /en/ /en/terms /en/privacy /en/legal-notice /en/delete-account /cgu /confidentialite; do
  curl -s -o /dev/null -w "$p %{http_code}\n" "https://www.trycast.fr$p"; done
curl -s https://www.trycast.fr/ | grep -oE '<link rel="alternate" hreflang="[^"]*"[^>]*>'
```

⚠️ **Le nombre d'empreintes est le point à regarder, pas la validité du JSON.** Un fichier
parfaitement valide avec **une seule** empreinte se déploie sans broncher et casse chez une partie
seulement des testeurs — ceux qui ont reçu une variante signée par la clé *précédente*. C'est le cas
constaté au premier déploiement (2026-09-09) : une empreinte en ligne là où il en faut trois.
L'apex doit par ailleurs répondre **308 vers `www`**, ce qui confirme que seul `www` avait à être
déclaré côté natif.

⚠️ **L'AASA n'a pas d'extension** : Vercel le servirait en `application/octet-stream` et Apple
l'ignorerait en silence. Le `Content-Type: application/json` est forcé par le bloc `headers` de
`vercel.json` — à vérifier après déploiement :

```bash
curl -sI https://www.trycast.fr/.well-known/apple-app-site-association | grep -i content-type
```

### Vignettes OpenGraph

`base-layout.astro` émet le bloc social complet (`og:image` absolue via `Astro.site`, `twitter:*`,
`canonical`). Deux réglages non évidents : une `og:image` **relative** est ignorée sans message par
les robots, d'où le `site:` d'`astro.config.mjs` ; et sur une page `noindex` (atterrissages
d'e-mail, invitations) `canonical` et `og:url` sont **omis**, parce qu'ils ramèneraient au chemin
nu — un robot qui s'en sert pour bâtir sa carte perdrait le code au passage.

Les PNG 1200×630 sont versionnés et reproductibles par `scripts/build-og-images.sh` (ImageMagick +
les polices du DS prises dans `apps/mobile/node_modules`). ImageMagick n'ayant pas de délégué SVG
fiable ici, le ballon du logo y est retracé en primitives plutôt que converti.

## Déploiement

Vercel, projet créé par Corentin (2026-07-15), **branché sur le repo GitHub avec Root Directory `apps/web`** (réglage du dashboard ; c'était `web` avant la réorganisation du dépôt du 2026-09-15) : chaque push sur `main` rebuilde le site — c'est **la** voie de déploiement. L'installation est celle par défaut (`npm ci`) : le stub tsconfig n'est plus nécessaire (voir piège ci-dessus). Les `PUBLIC_*` sont bakées au build (env vars Vercel côté dashboard, ou `.env` non versionné en local). Le connecteur Vercel de Claude **ne voit pas ce projet** (`list_projects` vide — autre scope) : ne pas tenter `deploy_to_vercel` (risque de créer un projet parallèle), passer par un commit + push (accord de Corentin requis pour le push).
