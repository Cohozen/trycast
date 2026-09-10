# Dépendances — journal des décisions

Ce fichier existe pour qu'une version qu'on ne prend pas soit **une décision**, pas un oubli.
`npm run deps:check` mesure l'écart, l'issue hebdomadaire le rappelle, et c'est ici que chaque
majeure en retard porte sa raison de l'être et la condition qui la fera monter.

Trois familles n'ont rien à faire dans ce fichier, parce qu'elles n'appellent aucune décision :
ce que le SDK réclame (`npx expo install --fix`), les rattrapages dans la plage déjà déclarée
(`npm update`), et les paquets écartés par le rapport.

> ⚠️ Un paquet **natif** ne se monte pas au fil de l'eau : le rebuild du dev client est le moindre
> problème, la montée **déplace l'empreinte** et coupe les builds déjà distribués de toute mise à
> jour à distance, silencieusement. Ces montées se groupent avec une release.

## État au 2026-09-09

| Paquet | Installé | Disponible | Décision | Revoir quand |
|---|---|---|---|---|
| `typescript` (app + `web/`) | 6.0.3 | 7.0.2 | ❌ **bloqué** | TypeScript 7.1 publié **et** adopté par typescript-eslint et le tooling Astro |
| `eslint` | 9.39.4 | 10.10.0 | ⏸️ différé, sans risque | prochain lot d'outillage — à faire avec Vitest 5 |
| `vitest` | 4.1.9 | 5.0.0 | ⏸️ différé, sans risque | idem |
| `@aptabase/react-native` ⚑ | 0.5.0 | 0.6.0 | ⏸️ sans objet | quand une release native passe de toute façon |
| Famille SDK (async-storage 3, Sentry 8, gesture-handler 3…) | — | — | ❌ **ne pas suivre** | sortie d’un SDK 58 — **pas encore annoncé** (canary seulement) |

---

## `typescript` 6 → 7 — bloqué par l'écosystème

**Ce que ça apporte.** TypeScript 7 (3 août 2026) remplace le compilateur JavaScript par un portage
natif en Go : 8 à 12× plus rapide sur une vérification complète. Sur un projet de cette taille le
gain se compterait en secondes, mais il est réel en CI.

**Ce qui casse.** La 7.0 durcit en erreurs les dépréciations de la 6.0, `types` ne récupère plus
automatiquement tous les paquets `@types`, et `rootDir` change de défaut. Surtout : **la 7.0 est
livrée sans API programmatique stable** — elle est annoncée pour la 7.1. Les outils qui ont besoin
de cette API ne peuvent donc pas l'utiliser.

**Pourquoi on ne monte pas.** Ce projet dépend deux fois de cette API : `expo lint` passe par
typescript-eslint, et `web/` par `@astrojs/check`. Les deux restent sur TypeScript 6 tant que la 7.1
n'est pas là. Monter maintenant reviendrait à échanger quelques secondes de `tsc` contre un lint et
un `astro check` cassés — les deux commandes que la CI exécute.

**Condition de montée.** TypeScript 7.1 publié, **et** typescript-eslint et Astro passés dessus.
Les deux `package.json` (racine et `web/`) se bumpent ensemble.

## `eslint` 9 → 10 — différé, mais rien ne s'y oppose

**Ce que ça apporte.** Nettoyage : `styleText` de Node à la place de chalk, méthodes `SourceCode`
dépréciées retirées, `RuleTester` plus strict, meilleur suivi des références JSX.

**Ce qui casse.** Le support d'`eslintrc` disparaît — sans effet ici, le projet est déjà en flat
config ([eslint.config.js](../eslint.config.js)) — et Node doit être en `^20.19 || ^22.13 || >=24`,
ce qui est le cas partout (CI en 24).

**Pourquoi on ne monte pas.** Aucune urgence, et une inconnue à lever : `eslint-config-expo@57`
déclare `eslint >=8.10`, ce qui autorise la 10 sans rien prouver — Expo ne l'a pas testée avec.
La montée se juge donc sur pièce : `npm run lint -- --max-warnings 0` au vert, ou pas.

**Condition de montée.** Un lot d'outillage, avec Vitest 5. Aucun impact sur ce que les utilisateurs
exécutent : pas de code natif, pas d'empreinte déplacée, éligible à n'importe quel moment.

## `vitest` 4 → 5 — différé, prêt à passer

**Ce que ça apporte.** Node 22 et Vite 6.4 au minimum (ici Node 24 et Vite 8.1 : déjà satisfaits),
`@vitest/expect` intégré, sorties par défaut regroupées sous `.vitest/`.

**Ce qui casse.** L'option `sequential` disparaît au profit de `concurrent`, les appels hoistés
(`vi.mock`) doivent être au premier niveau, `toHaveTextContent` devient strict, `@vitest/runner`
n'est plus publié séparément, `attachmentsDir` déménage.

**Pourquoi on ne monte pas.** Rien de plus qu'un lot à ouvrir. [vitest.config.ts](../vitest.config.ts)
tient en trois options (`environment: 'node'`, `include`, un alias) dont **aucune ne figure dans la
liste des ruptures**, et les tests sont des modules purs sans DOM : ni matcher DOM, ni pièces
jointes, ni exécution séquentielle. Le risque tient dans un `npm test`.

**Condition de montée.** Même lot qu'ESLint 10.

## `@aptabase/react-native` 0.5 → 0.6 ⚑ natif — sans objet

**Ce que ça apporte.** Un `trackError()` structuré et une option `enableCrashReporting` qui capture
les erreurs JavaScript non gérées. Pas de rupture annoncée par rapport à 0.5.

**Pourquoi on ne monte pas.** La nouveauté est précisément ce qu'on ne veut pas : **les plantages
sont déjà collectés par Sentry**, déclaré au registre des traitements et à la page de confidentialité.
Brancher un second collecteur de crash serait un **nouveau traitement** — donc `docs/rgpd/registre-des-traitements.md`,
`docs/rgpd/sous-traitants.md`, `web/src/pages/confidentialite.astro` et les déclarations des stores à
reprendre — pour une redondance. Reste un correctif de 0.5.1 à prendre au passage.

⚠️ Si cette version est un jour installée : **ne pas activer `enableCrashReporting`**, ou traiter la
mise en conformité dans le même lot.

**Condition de montée.** Quand une release embarquant du natif part de toute façon. Aucune raison de
déplacer l'empreinte pour ça seul.

## Famille SDK — `latest` est un piège, pas un retard

`npm outdated` affiche `@react-native-async-storage/async-storage` 3.1.1, `@sentry/react-native`
8.25.0, `react-native-gesture-handler` 3.2.1, `react-native-get-random-values` 2.0.0,
`react-native` 0.87, `react` 19.3… Ce ne sont pas des retards : **le SDK 57 dicte ces versions**, et
ce sont elles qu'Expo teste ensemble. Les installer une par une, c'est sortir du couloir supporté et
découvrir la casse au premier build natif.

⚠️ **Le SDK 58 n'existe pas** (vérifié le 2026-09-10) : le SDK 57 est sorti le 30 juin 2026 et reste
le dernier publié — `latest` **et** `next` pointent tous deux sur `expo@57.0.21`, et la seule trace
d'un 58 est une canary quotidienne (`58.0.0-canary-2026…`), qui n'est pas une cible. « Attendre le
SDK 58 » n'est donc pas une veille à tenir : il n'y a rien à surveiller avant l'annonce, et le
rapport continuera d'écarter ces paquets d'ici là.

Quand il sortira, ce sera un lot en soi : `npx expo install --fix`, rebuild du dev client, passes
visuelles iOS **et** Android, nouvelle empreinte, et donc une release.

## Ce qui ne se décide pas

- **À réaligner sur le SDK** (`npx expo install --fix`) — Expo réclame ces versions, elles sont
  testées ensemble. Aujourd'hui **26 paquets**, presque tous natifs — dont `expo` 57.0.2 → 57.0.21
  et `expo-router` 57.0.3 → 57.0.20, soit une vingtaine de correctifs publiés depuis le SDK 57.0.2 :
  c'est le plus gros écart du projet, et il se rattrape en une commande suivie d'une release.
- **Rattrapage dans la plage** (`npm update`) — déjà autorisé par `package.json`, seul le lock bouge.
- **`npm audit`** — la synthèse figure au rapport. Sur une app React Native, l'essentiel des alertes
  vit dans des dépendances de build inaccessibles à l'exécution : à lire, pas à corriger
  mécaniquement.
