---
name: trycast-domain-feature
description: Ajouter ou étendre un domaine métier TryCast dans src/features/<domaine>/ (hooks TanStack Query, validation, traduction d'erreurs FR, types dérivés de Database, composants colocalisés, écrans Expo Router). À utiliser dès qu'on crée/modifie une feature (leagues, matches, predictions, scoring, profile…) ou un écran qui la consomme.
---

# TryCast — ajouter/étendre un domaine métier

Squelette de référence : `src/features/leagues/`. Reproduire **exactement** cette structure. Textes UI et messages d'erreur **en français** (guillemets typographiques `’`).

## Structure d'un domaine (`src/features/<domaine>/`)

- `types.ts` — types **dérivés** de `Database` (jamais réécrits à la main) :
  ```ts
  export type LeagueRow = Database['public']['Tables']['leagues']['Row'];
  export type LeaderboardEntry =
      Database['public']['Functions']['get_global_leaderboard']['Returns'][number];
  ```
- `validation.ts` — **miroir client** des contraintes SQL (pas la source de vérité, la RLS l'est). Retourne `string | null` (message FR ou `null` si OK). Commenter que la contrainte réelle est côté serveur.
- `errors.ts` — `toFrench<Domaine>Message(error: unknown): string` : `switch` sur `error instanceof PostgrestError ? error.code : undefined`. Mapper les `errcode` que **tes RPC/migrations** lèvent (`P0002`, `23514`, `42501`, `23505`…) vers un message FR ; `default` = message générique réseau.
- `use-*.ts` — **un hook par fichier**, un fichier par hook. TanStack Query v5 :
  - Lecture : `useQuery({ queryKey: ['<domaine>', …], queryFn })`
  - Écriture : `useMutation({ mutationFn, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['<domaine>'] }) })`
  - Toujours `const { data, error } = await supabase.rpc(...)` / `.from(...)` puis `if (error) throw error;`
  - Privilégier une **RPC** pour toute écriture multi-tables/atomique (décision actée) plutôt que des inserts client.
  - JSDoc en tête expliquant le *pourquoi* (atomicité, sécurité), comme dans le repo.
- `components/` — composants **propres au domaine** (kebab-case, un composant/fichier). Styling NativeWind inline via `className`.
- `*.test.ts` — tests Vitest **colocalisés** pour la logique pure (`validation`, `errors`, formatage). Pas de test pour les hooks réseau.

Un composant **réutilisable** (multi-domaines) va dans `src/components/` (primitives dans `src/components/ui/`), pas dans la feature.

## Écrans (Expo Router, `src/app/`)

- Groupes `(auth)` et `(app)` ; onglets dans `src/app/(app)/(tabs)/`. Routes dynamiques : `src/app/(app)/<domaine>/[id].tsx`, actions dédiées `create.tsx` / `join.tsx`.
- L'écran consomme les hooks du domaine et affiche `toFrench<Domaine>Message(error)` sur échec. Le client n'est qu'une UX : jamais de règle de sécurité côté client, la RLS tranche.

## Vérification (obligatoire avant de clore un lot)

```
npm run typecheck && npm run lint && npm run format:check && npm run test
```

Si le domaine touche au schéma → voir la skill **trycast-supabase-migration**.
