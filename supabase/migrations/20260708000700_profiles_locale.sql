-- Lot 5.5 : langue de l'utilisateur pour les contenus localisés côté serveur.
-- Les notifications push du Lot 6 (notify-deadline / notify-results) liront
-- cette colonne pour composer leurs messages dans la langue de chacun.
--
-- null = jamais synchronisée : l'app écrit la langue résolue par i18next
-- (langue device, repli fr) au démarrage de session. Format BCP 47 court
-- ('fr', éventuellement 'fr-CA') — le check évite seulement les valeurs
-- aberrantes, la langue effective est arbitrée côté client/EF.

alter table public.profiles
  add column locale text
  constraint locale_format check (locale ~ '^[a-z]{2}(-[A-Z]{2})?$');

-- Grants par colonne (même logique que 20260705000500) : la policy RLS
-- "profiles_update_own" reste la seule porte, on ouvre juste la colonne.
grant update (locale) on public.profiles to authenticated;
