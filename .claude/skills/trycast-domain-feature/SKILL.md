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
- `errors.ts` — `to<Domaine>MessageKey(error: unknown): <Domaine>MessageKey` : mapper les `errcode` que **tes RPC/migrations** lèvent (`P0002`, `23514`, `42501`, `23505`…) vers des clés `'<ns>:errors.*'` ; fallback `'common:errors.network'` / `'common:errors.generic'`. Modèle : `src/features/auth/errors.ts`. L'écran traduit : `t(toXMessageKey(err))`.
- `src/locales/fr/<domaine>.json` — le namespace du domaine (sections `errors`, `validation`, + sections d'écran). Une clé ajoutée ici est immédiatement typée (une clé manquante casse `tsc`). Pluriels : suffixes `_one`/`_other` + `t('…', { count })`.
- `use-*.ts` — **un hook par fichier**, un fichier par hook. TanStack Query v5 :
  - Lecture : `useQuery({ queryKey: ['<domaine>', …], queryFn })`
  - Écriture : `useMutation({ mutationFn, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['<domaine>'] }) })`
  - Toujours `const { data, error } = await supabase.rpc(...)` / `.from(...)` puis `if (error) throw error;`
  - Privilégier une **RPC** pour toute écriture multi-tables/atomique (décision actée) plutôt que des inserts client.
  - JSDoc en tête expliquant le *pourquoi* (atomicité, sécurité), comme dans le repo.
- `components/` — composants **propres au domaine** (kebab-case, un composant/fichier). Styling NativeWind inline via les **tokens du design system** et les primitives `src/components/ui/` (voir la skill **trycast-design-system**).
- `*.test.ts` — tests Vitest **colocalisés** pour la logique pure (`validation`, `errors`, formatage). Pas de test pour les hooks réseau.

Un composant **réutilisable** (multi-domaines) va dans `src/components/` (primitives dans `src/components/ui/`), pas dans la feature.

## Écrans (Expo Router, `src/app/`)

- Groupes `(auth)` et `(app)` ; onglets dans `src/app/(app)/(tabs)/`. Routes dynamiques : `src/app/(app)/<domaine>/[id].tsx`, actions dédiées `create.tsx` / `join.tsx`. Écran hors-tabs avec header natif : le déclarer dans `src/app/(app)/_layout.tsx` (`headerShown: true` + `title` i18n) — le back label vient du `title` de l'écran précédent (d'où `title: ''` sur `(tabs)`).
- ⚠️ **Routes typées** (vécu 2026-07-13) : après ajout d'une route, `router.push('/nouvelle-route')` casse `tsc` tant que `.expo/types/router.d.ts` (gitignoré, la CI n'est pas affectée) n'est pas régénéré — il n'y a pas de commande dédiée : lancer `npx expo start` quelques secondes (boucle `grep` sur le fichier) puis tuer Metro.
- L'écran monte `const { t } = useTranslation(['<ns>', 'common'])` et affiche `t(to<Domaine>MessageKey(error))` sur échec. Le client n'est qu'une UX : jamais de règle de sécurité côté client, la RLS tranche.
- Vérifier chaque écran en **light et dark** (les tokens basculent seuls, mais un oubli de token se voit tout de suite en dark).

## Vérification (obligatoire avant de clore un lot)

```
npm run typecheck && npm run lint && npm run format:check && npm run test
```

Si le domaine touche au schéma → voir la skill **trycast-supabase-migration**.
