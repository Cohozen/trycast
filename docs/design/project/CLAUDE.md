# TryCast — notes projet

## Design system (TryCast, namespace `TryCastDesignSystem_a0f4ea`)
- Le mode **dark** (thème vert, `--surface: var(--green-800)`, etc.) n'est PAS entièrement pris en charge par tous les composants du DS.
- En particulier, le **`TabBar` variante flottante** code en dur du blanc (`#ffffff`) pour le verre du bar, la pastille active et ses bordures. En dark mode ça vire au crème/blanc au lieu de rester cohérent avec les tons verts. → Retinter en tons verts (`--green-600`/`--green-700`) côté écran quand on est en dark.
- Règle générale : rester cohérent avec les tons **verts** en dark mode ; le crème est réservé au thème light (papier).
