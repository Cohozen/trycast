-- handle_new_user est une fonction trigger : pas d'exposition via l'API REST
revoke execute on function public.handle_new_user() from anon, authenticated, public;
