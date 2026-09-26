-- Le filtre des pseudos (20260926000100) exempte les comptes de démonstration.
--
-- Constat en prod le 2026-09-26 : le compte des relecteurs des stores s'appelle
-- « DemoTryCast », que le filtre refuse (usurpation de l'éditeur). La contrainte
-- était `not valid`, mais Postgres revérifie un check à CHAQUE mise à jour de
-- la ligne, même quand le pseudo ne change pas : son profil devenait
-- impossible à modifier (langue synchronisée au lancement, photo, pseudo), et
-- c'est justement le compte que manipule le relecteur App Store.
--
-- `is_demo` n'est écrit que par service_role (aucun grant client, cf.
-- 20260903000100) : un joueur ne peut pas s'en servir pour contourner le
-- filtre. Même nom de contrainte : toProfileMessageKey s'y fie.

alter table public.profiles drop constraint profiles_username_clean;

alter table public.profiles
    add constraint profiles_username_clean
    check (is_demo or public.username_is_clean(username)) not valid;
