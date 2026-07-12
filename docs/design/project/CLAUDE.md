# TryCast — notes projet

## Design system (TryCast, namespace `TryCastDesignSystem_a0f4ea`)
- Le DS est en **v2** : surfaces neutres chaudes. Thème **light** = sable/crème (`--surface` clair), thème **dark** = **charbon chaud** (`--surface: var(--char-850)`), PAS vert. Le vert est la **marque** (`--brand`), le grenat est le **spark** (`--accent` : CTA, live, sélection).
- Le **`TabBar` flottant** utilise des tokens de verre théma-aware : `--glass-bar`, `--glass-hairline`, `--glass-pill`, `--glass-pill-border`. En light ils sont basés sur `#ffffff` (verre blanc) ; en dark, `--glass-hairline` est une hairline claire et `--glass-pill`/`--glass-pill-border` sont teintés **accent** (grenat) pour l'onglet actif.
- Pour garder les **bordures du TabBar cohérentes avec les tokens**, on redéfinit `--glass-hairline`/`--glass-pill-border` à partir de la rampe `--border-strong` par thème, côté écran (voir `MesMatchs.dc.html`) — ne pas hardcoder de couleur verte.
