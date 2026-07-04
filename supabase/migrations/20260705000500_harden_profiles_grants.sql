-- Durcissement des grants sur public.profiles (même logique que le Lot 2 :
-- les default privileges legacy donnent grant all à anon/authenticated sur
-- toute nouvelle table). La sécurité est déjà portée par RLS (select
-- authentifié, update de son propre profil uniquement), ceci est de la
-- défense en profondeur : on aligne les grants sur l'usage réel — rien pour
-- anon, lecture + modification du seul username pour authenticated.
-- handle_new_user est security definer (owner postgres) et ne dépend pas de
-- ces grants ; la suppression de compte passe par la cascade auth.users.

revoke all on public.profiles from anon;
revoke all on public.profiles from authenticated;
grant select on public.profiles to authenticated;
grant update (username) on public.profiles to authenticated;
