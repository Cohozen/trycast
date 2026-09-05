---
name: trycast-domain-feature
description: Ajouter ou étendre un domaine métier TryCast dans src/features/<domaine>/ (hooks TanStack Query, validation et erreurs en clés i18n, types dérivés de Database, composants colocalisés, écrans Expo Router). À utiliser dès qu'on crée/modifie une feature (leagues, matches, predictions, scoring, profile…) ou un écran qui la consomme.
---

# TryCast — ajouter/étendre un domaine métier

Squelette de référence : `src/features/leagues/`. Reproduire **exactement** cette structure. **Aucune chaîne UI en dur** : tout texte visible vit dans `src/locales/fr/<domaine>.json` (FR = langue source, guillemets typographiques `’`) et passe par i18next.

## Structure d'un domaine (`src/features/<domaine>/`)

- `types.ts` — types **dérivés** de `Database` (jamais réécrits à la main) :
  ```ts
  export type LeagueRow = Database['public']['Tables']['leagues']['Row'];
  export type LeaderboardEntry =
      Database['public']['Functions']['get_global_leaderboard']['Returns'][number];
  ```
- `validation.ts` — **miroir client** des contraintes SQL (pas la source de vérité, la RLS l'est). Retourne une **clé i18n ou `null`** : type union de clés littérales (ex. `'auth:validation.usernameTooShort' | …`), jamais un template type `` `ns:${string}` `` (t() exige des littéraux). Commenter que la contrainte réelle est côté serveur.
- `errors.ts` — `to<Domaine>MessageKey(error: unknown): <Domaine>MessageKey` : mapper les `errcode` que **tes RPC/migrations** lèvent (`P0002`, `23514`, `42501`, `23505`…) vers des clés `'<ns>:errors.*'` ; fallback `'common:errors.network'` / `'common:errors.generic'`. Modèle : `src/features/auth/errors.ts`. L'écran traduit : `t(toXMessageKey(err))`. ⚠️ **Lire le `code` en duck-typing** (`typeof error === 'object' && 'code' in error`), jamais `instanceof PostgrestError` : sous Hermes le bundle embarque une seconde copie de postgrest-js et l'instanceof échoue silencieusement (vécu 2026-07-16 — P0002 s'affichait comme erreur serveur). Modèle : `src/features/leagues/errors.ts`.
- `src/locales/fr/<domaine>.json` — le namespace du domaine (sections `errors`, `validation`, + sections d'écran). Une clé ajoutée ici est immédiatement typée (une clé manquante casse `tsc`). Pluriels : suffixes `_one`/`_other` + `t('…', { count })`. ⚠️ `count` **déclenche** la pluralisation i18next : pour une simple interpolation invariable (« il y a {{value}} min »), nommer la variable autrement.
- ⚠️ **`Intl` sous Hermes : tout n'est pas là** (vécu 2026-07-25). `Intl.RelativeTimeFormat` **n'existe pas** — `new Intl.RelativeTimeFormat(...)` plante l'écran en `undefined cannot be used as a constructor`, et rien ne le signale avant l'exécution sur simulateur/device (Node passe, donc typecheck et Vitest sont verts). `Intl.DateTimeFormat`, `Intl.NumberFormat` et `Intl.PluralRules` (utilisé par les pluriels i18next), eux, fonctionnent. Pour du temps relatif : une fonction de domaine pure qui rend **une clé i18n + une valeur**, traduite dans le composant — modèle `src/features/notifications/format-notification-time.ts`. Corollaire général : une API JS « standard » utilisée pour la première fois dans le projet se vérifie **au simulateur**, pas seulement en test.
- `use-*.ts` — **un hook par fichier**, un fichier par hook. TanStack Query v5 :
  - Lecture : `useQuery({ queryKey: ['<domaine>', …], queryFn })`
  - Écriture : `useMutation({ mutationFn, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['<domaine>'] }) })`
  - Toujours `const { data, error } = await supabase.rpc(...)` / `.from(...)` puis `if (error) throw error;`
  - Privilégier une **RPC** pour toute écriture multi-tables/atomique (décision actée) plutôt que des inserts client.
  - JSDoc en tête expliquant le *pourquoi* (atomicité, sécurité), comme dans le repo.
  - ⚠️ **Une query en erreur reste en erreur pendant tout son refetch** (v5) : `status` vaut `'error'` et `isPending` **faux** tant que le rejeu n'a pas abouti. Un écran qui teste `isError` **avant** `isPending` réaffiche donc son état d'erreur au lieu d'un squelette — et s'il le fait en `return` plein écran, il emporte aussi son chrome (titre, basculeur d'onglets) : ça se perçoit comme un **clignotement**. Ordre à respecter dans le rendu : chargement (`isPending` **ou** `isFetching && data === undefined`), puis erreur (et seulement si rien n'est en vol), puis vide, puis contenu — et l'erreur **dans le flux**, sous le chrome, jamais à sa place. Modèle : `src/app/(app)/(tabs)/leaderboard.tsx`, corrigé le 2026-09-05.
  - ⚠️ **`useDeferredValue` + `enabled` : deux horloges.** Quand `enabled` suit la valeur immédiate et que l'affichage suit la valeur différée, le composant lit pendant la transition l'état de la query de **l'autre** portée. Le contenu, lui, doit rester sur la valeur différée (c'est tout l'intérêt) : la parade est de neutraliser l'état d'erreur tant que `deferredX !== x`, pas de basculer les deux sur la même horloge.
  - `placeholderData: keepPreviousData` dès qu'un **paramètre de pagination entre dans la `queryKey`** (`limit`, curseur) : sans lui, « Charger plus » repasse la query en `pending` et **vide la liste affichée**. À ne PAS mettre quand la clé change d'**entité** (passer d'une ligue à une autre montrerait brièvement les membres de la précédente).
  - Réinitialiser un état de pagination se fait **dans le gestionnaire** qui change de contexte, pas dans un `useEffect` : la règle de lint `react-hooks/set-state-in-effect` refuse un `setState` synchrone en effet.
- `components/` — composants **propres au domaine** (kebab-case, un composant/fichier). Styling NativeWind inline via les **tokens du design system** et les primitives `src/components/ui/` (voir la skill **trycast-design-system**).
- `*.test.ts` — tests Vitest **colocalisés** pour la logique pure (`validation`, `errors`, formatage). Pas de test pour les hooks réseau.

Un composant **réutilisable** (multi-domaines) va dans `src/components/` (primitives dans `src/components/ui/`), pas dans la feature.

## Écrans (Expo Router, `src/app/`)

- Groupes `(auth)` et `(app)` ; onglets dans `src/app/(app)/(tabs)/`. Routes dynamiques : `src/app/(app)/<domaine>/[id].tsx`, actions dédiées `create.tsx` / `join.tsx`. Écran hors-tabs avec header natif : le déclarer dans `src/app/(app)/_layout.tsx` (`headerShown: true` + `title` i18n) — le back label vient du `title` de l'écran précédent (d'où `title: ''` sur `(tabs)`).
- ⚠️ **Routes typées** (vécu 2026-07-13) : après ajout d'une route, `router.push('/nouvelle-route')` casse `tsc` tant que `.expo/types/router.d.ts` (gitignoré, la CI n'est pas affectée) n'est pas régénéré. Le plus rapide est `npx expo customize tsconfig.json` — il traverse le routeur et réécrit `router.d.ts` en quelques secondes, sans démarrer Metro (vérifié 2026-07-25). À défaut, lancer `npx expo start` puis le tuer.
- L'écran monte `const { t } = useTranslation(['<ns>', 'common'])` et affiche `t(to<Domaine>MessageKey(error))` sur échec. Le client n'est qu'une UX : jamais de règle de sécurité côté client, la RLS tranche.
- Vérifier chaque écran en **light et dark** (les tokens basculent seuls, mais un oubli de token se voit tout de suite en dark).

## Vérification (obligatoire avant de clore un lot)

```
npm run typecheck && npm run lint && npm run format:check && npm run test
```

Si le domaine touche au schéma → voir la skill **trycast-supabase-migration**.
