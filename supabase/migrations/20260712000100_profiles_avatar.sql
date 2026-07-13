-- Bloc « photo de profil » : URL publique de l'avatar de l'utilisateur.
-- Le fichier vit dans le bucket Storage `avatars` (migration 000200), chemin
-- `<userId>/avatar.jpg` ; on stocke ici l'URL publique renvoyée par Storage,
-- avec un suffixe ?v=<timestamp> anti-cache ajouté côté client à chaque upload
-- (le chemin est stable → sans ce cache-buster l'ancienne image resterait
-- affichée). null = pas de photo, l'app retombe sur l'avatar à initiales.
--
-- Grant par colonne (même logique que 20260705000500 / 20260708000700) : la
-- policy RLS "profiles_update_own" reste la seule porte d'écriture, on ouvre
-- juste la colonne avatar_url à authenticated. La lecture est déjà couverte
-- par "profiles_select_authenticated" (les avatars s'affichent dans les
-- classements et ligues, comme les pseudos).

alter table public.profiles add column avatar_url text;

grant update (avatar_url) on public.profiles to authenticated;
