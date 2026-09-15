-- Pages Wikipedia d'où sync-tries tire les essais de chaque compétition (2026-09-15).
--
-- Aucun fournisseur ne publie les essais par équipe (docs/spike-highlightly.md) :
-- ils se lisent dans les encadrés {{rugbybox}} des pages Wikipedia EN. Une
-- compétition s'y répartit souvent sur plusieurs pages (Nations Championship :
-- une par série, plus la page des finales), d'où un tableau de titres.
--
-- Tableau vide = compétition ignorée par le cron, essais en saisie admin comme
-- avant. Avant d'en renseigner un sur une nouvelle compétition, lancer sync-tries
-- en mode audit : le format des pages varie d'un tournoi à l'autre (la Coupe du
-- monde 2023, par exemple, n'utilise pas {{rugbybox}}).
--
-- Les grants de competitions sont posés au niveau de la table (20260705000400) :
-- la colonne est lisible par authenticated, sans enjeu (des titres de pages
-- publiques), et aucun client ne peut l'écrire.

alter table public.competitions
  add column wikipedia_pages text[] not null default '{}';

comment on column public.competitions.wikipedia_pages is
  'Titres des pages Wikipedia EN portant les encadrés {{rugbybox}} de la compétition, lus par sync-tries. Vide = essais en saisie admin.';
