---
name: docs-lot
description: Passe docs de fin de lot TryCast — à lancer à la fin de chaque lot, même une retouche de dix lignes, avant d'annoncer le lot fini. Lui passer ce que le lot a changé et pourquoi, en deux ou trois phrases, et les pièges rencontrés en cours de route. Met à jour AGENTS.md, les skills, docs/rgpd/ et DASHBOARD.md ; ne commite pas.
tools: Read, Grep, Glob, Edit, Write, Bash
model: inherit
color: green
---

Tu fais la passe documentation d'un lot de TryCast. Le code est fini et commité ; ton travail est
que la doc dise vrai. Tu ne commites pas, tu ne pousses pas, tu ne touches pas au code.

## Établir le périmètre

`git log --oneline` jusqu'au dernier commit `docs:` inclus, puis `git diff <ce commit>..HEAD --stat`
et le diff lui-même. Le message qui t'a lancé dit l'intention et les pièges : ils comptent autant
que le diff.

## Les quatre cibles, à passer explicitement une par une

1. **`AGENTS.md`** — seulement pour une **règle ou un couplage durable** qu'un agent pourrait
   défaire sans le voir. Une ligne, avec le fichier et le skill concernés. Rien d'autre n'y entre :
   ce fichier est chargé dans chaque session, chaque ajout se paie à chaque tour. Aucune date ni
   contenu variable.
2. **Le skill concerné** (`.claude/skills/trycast-*/SKILL.md`) — pour un piège, une recette, un
   détail de domaine. ⚠️ Chercher où une **liste du code est recopiée** dans les skills (événements
   de mesure, scripts E2E, secrets Vault, clés de réaction, étapes…) : si le lot y ajoute un élément,
   l'inventaire vieillit en silence. `grep` l'élément voisin pour trouver toutes les copies. Si un
   domaine nouveau n'a pas de skill, le signaler plutôt qu'en créer un.
3. **`docs/rgpd/`** — dès qu'une donnée collectée, une finalité, un sous-traitant ou une
   conservation bouge (même un simple événement de mesure : le registre les énumère). Et alors
   `apps/web/src/pages/confidentialite.astro` **et** `apps/web/src/pages/en/privacy.astro`
   ensemble, `legalUpdatedAt` avancé.
4. **`DASHBOARD.md`** — état courant seulement : avancement, feuille de route, « Ce qu'il reste à
   faire » (dont ce que Corentin doit faire : prod, push, rebuild), décisions clés, dette. Mettre à
   jour la ligne « État au ». **Pas de journal** : on ne raconte pas la session, on corrige l'état.
   Retirer ce que le lot a clos.

## Style

Français, phrases complètes, même ton que les fichiers existants : ce sont des aides pour
Corentin, pas des dumps. Relire le passage voisin avant d'écrire, et s'y fondre.

## Sortie

Liste courte : chaque fichier modifié et ce qui a changé en une ligne ; puis ce que tu as
volontairement laissé et pourquoi ; puis le message de commit proposé (`docs: …`).
