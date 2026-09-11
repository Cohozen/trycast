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

## État au 2026-09-11

| Paquet | Installé | Disponible | Décision | Revoir quand |
|---|---|---|---|---|
| `typescript` (app + `web/`) | 6.0.3 | 7.0.2 | ❌ **bloqué** | TypeScript 7.1 publié **et** adopté par typescript-eslint et le tooling Astro |
| `eslint` | 9.39.5 | 10.10.0 | ❌ **bloqué** (essayé le 2026-09-11) | `eslint-plugin-react` publié avec le support d'ESLint 10, et repris par `eslint-config-expo` |
| `vitest` | 4.1.11 | 5.0.0 | ⏸️ différé, par choix | prochain lot d'outillage — n'attend plus ESLint |
| `@aptabase/react-native` ⚑ | 0.5.0 | 0.6.0 | ⏸️ sans objet | quand une release native passe de toute façon |
| Famille SDK (async-storage 3, Sentry 8, gesture-handler 3…) | — | — | ❌ **ne pas suivre** | SDK 58 **stable** — en préversion depuis le 2026-09-10 |

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

## `eslint` 9 → 10 — bloqué par les plugins qu'embarque Expo

**Ce que ça apporte.** Nettoyage : `styleText` de Node à la place de chalk, méthodes `SourceCode`
dépréciées retirées, `RuleTester` plus strict, meilleur suivi des références JSX.

**Ce qui casse — constaté le 2026-09-11, pas supposé.** `eslint-config-expo@57` déclare
`eslint >=8.10`, mais ses plugins ne suivent pas :

- **`eslint-plugin-react` 7.37.5 fait planter tout le lint** : avec `settings.react.version:
  'detect'`, que pose la config Expo, il appelle `context.getFilename()`, retiré en v10
  (`TypeError: contextOrFilename.getFilename is not a function`). Plus un seul fichier n'est linté.
- **`eslint-plugin-import` 2.32 et `eslint-plugin-react` déclarent `eslint` jusqu'à `^9`.** npm
  passe outre avec un simple avertissement, mais range alors ces plugins à part dans
  `eslint-config-expo/node_modules` : `eslint-module-utils` ne trouve plus le résolveur TypeScript
  et charge le compilateur `typescript` à sa place (`typescript with invalid interface loaded as
  resolver`). `npm ls` sort par ailleurs en erreur (`ELSPROBLEMS`).
- `eslint-plugin-expo` 1.1 déclare `eslint ^9.24` en **dépendance**, pas en pair : il embarque sa
  propre copie d'ESLint 9.

Un contournement tient : lire la version de React soi-même dans `eslint.config.js`, et des
`overrides` npm qui étendent la plage de pairs des trois plugins. Sonde à l'appui, il rend les
mêmes constats qu'ESLint 9. **Écarté par décision de Corentin** : trois rustines pour un outil
de développement, c'est trop.

**Pourquoi on ne monte pas.** Ni le SDK 57 ni le SDK 58 ne règlent le problème :
`eslint-config-expo@58.0.0` garde `eslint-plugin-react ^7.37.3`, dont la dernière version date
d'avril 2025 (une `7.8.0-rc.0` traîne en `next`). À noter : npm marque désormais ESLint 9
« no longer supported ». C'est accepté : l'outil ne tourne qu'en développement et en CI, jamais
dans l'app.

**Condition de montée.** `eslint-plugin-react` publié avec le support d'ESLint 10, **et** repris par
`eslint-config-expo`. Les plages de pairs se lisent avec `npm view eslint-plugin-react
peerDependencies`. La vérification ne se limite pas à « le lint est vert » : un fichier sonde qui
déclenche une règle de chaque plugin doit rendre les mêmes constats avant et après.

## `vitest` 4 → 5 — différé par choix, prêt à passer

**Ce que ça apporte.** Node 22 et Vite 6.4 au minimum (ici Node 24 et Vite 8.1 : déjà satisfaits),
`@vitest/expect` intégré, sorties par défaut regroupées sous `.vitest/`.

**Ce qui casse.** L'option `sequential` disparaît au profit de `concurrent`, les appels hoistés
(`vi.mock`) doivent être au premier niveau, `toHaveTextContent` devient strict, `@vitest/runner`
n'est plus publié séparément, `attachmentsDir` déménage.

**Pourquoi on ne monte pas.** Rien de plus qu'un lot à ouvrir. [vitest.config.ts](../vitest.config.ts)
tient en trois options (`environment: 'node'`, `include`, un alias) dont **aucune ne figure dans la
liste des ruptures**, et les tests sont des modules purs sans DOM : ni matcher DOM, ni pièces
jointes, ni exécution séquentielle. Le risque tient dans un `npm test`.

**Condition de montée.** Le prochain lot d'outillage. Elle était couplée à ESLint 10 ; ce couplage
tombe avec le blocage d'ESLint, et Vitest 5 n'a aucun obstacle connu. Le 2026-09-11, Corentin a
choisi de ne prendre que les correctifs (4.1.11, qui corrige la faille de `@vitest/mocker`
remontée par `npm audit`).

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

⚠️ **Le SDK 58 est en préversion depuis le 2026-09-10** (`expo@next` = `58.0.0-preview.0`, publié
le soir même où ce fichier le disait inexistant). `latest` reste `expo@57.0.21` : une préversion
n'est pas une cible pour une app distribuée, mais elle annonce une version stable dans les semaines
qui viennent. Le rapport continuera d'écarter ces paquets tant que le SDK 57 est installé.

Quand il sortira, ce sera un lot en soi : `npx expo install --fix`, rebuild du dev client, passes
visuelles iOS **et** Android, nouvelle empreinte, et donc une release.

## Ce qui ne se décide pas

- **À réaligner sur le SDK** (`npx expo install --fix`) — Expo réclame ces versions, elles sont
  testées ensemble. Aujourd'hui **25 paquets**, presque tous natifs — dont `expo` 57.0.2 → 57.0.21
  et `expo-router` 57.0.3 → 57.0.20, soit une vingtaine de correctifs publiés depuis le SDK 57.0.2 :
  c'est le plus gros écart du projet, et il se rattrape en une commande suivie d'une release.
- **Rattrapage dans la plage** (`npm update`) — déjà autorisé par `package.json`, seul le lock bouge.
- **`npm audit`** — la synthèse figure au rapport. Sur une app React Native, l'essentiel des alertes
  vit dans des dépendances de build inaccessibles à l'exécution : à lire, pas à corriger
  mécaniquement.
