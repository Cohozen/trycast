-- Chantier B de la 1.3.0 : filtre des pseudos (règle 1.2 de l'App Store, contenu
-- créé par les utilisateurs). Les pseudos sont visibles de tous les inscrits, via
-- le classement général : un pseudo injurieux, haineux ou qui se fait passer pour
-- l'éditeur doit être refusé à l'écriture.
--
-- Une contrainte check plutôt qu'un contrôle dans chaque RPC : le pseudo s'écrit
-- par trois chemins (métadonnées du signup via handle_new_user, claim_username,
-- update direct du client autorisé par la RLS), la contrainte les couvre tous.
-- Elle est `not valid` : les pseudos déjà en base ne sont pas revérifiés (requête
-- de contrôle en fin de fichier, à passer sur chaque projet).
--
-- Deux listes :
--   * des sous-chaînes sans ambiguïté, cherchées dans le pseudo débarrassé de
--     ses « _ » (« fils_de_pute » → « filsdepute ») ;
--   * des mots courts qu'une recherche par sous-chaîne attraperait à tort
--     (« con » dans « constant », « cunt » dans « Scunthorpe », « pute » dans
--     « computer », « support » dans « supporter ») : refusés seulement comme
--     segment entier entre deux « _ » ou comme pseudo entier.
-- Avant comparaison : minuscules, et les chiffres qui imitent une lettre sont
-- ramenés à elle (0→o, 1→i, 3→e, 4→a, 5→s, 7→t).
--
-- Plafond connu : un mot court collé à un autre (« salepute ») passe. Le
-- signalement depuis le profil prend le relais.
--
-- Enrichir la liste : `create or replace function` dans une nouvelle migration
-- (la contrainte ne revérifie pas les lignes existantes).
--
-- Côté client : la fonction est exposée en RPC (anon compris) pour que l'écran
-- d'inscription vérifie avant `signUp` ; sinon l'échec du trigger handle_new_user
-- remonte de GoTrue en « Database error saving new user », sans cause lisible.
-- Les autres chemins reçoivent un 23514 nommant `profiles_username_clean`,
-- traduit par toProfileMessageKey.

create or replace function public.username_is_clean(candidate text)
returns boolean
language sql
immutable
parallel safe
set search_path = ''
as $$
    with normalized as (
        select translate(lower(candidate), '013457', 'oieast') as s
    )
    select
        not exists (
            select 1
            from normalized, unnest(array[
                -- français
                'encul', 'salope', 'connard', 'connasse', 'conasse', 'batard',
                'putain', 'filsdepute', 'niqueta', 'tamere', 'enfoire',
                'branleur', 'branlette', 'couille', 'pedophil', 'pedoph',
                'violeur', 'bougnoul', 'youpin', 'negre', 'tarlouze', 'tapette',
                'gouine', 'sucemab', 'suceuse',
                -- anglais
                'fuck', 'shit', 'bitch', 'asshole', 'pussy', 'whore', 'slut',
                'nigger', 'nigga', 'faggot', 'porn', 'penis', 'vagin', 'dildo',
                'motherf', 'wanker', 'bastard',
                -- haine
                'hitler', 'siegheil', 'heilhitler', 'whitepower', 'whitepride',
                'kkk', 'jihad', 'terroris', 'holocaust',
                -- usurpation de l'éditeur
                'trycast', 'admin', 'moderat'
            ]) as word
            where position(word in replace(normalized.s, '_', '')) > 0
        )
        and not exists (
            select 1
            from normalized, unnest(string_to_array(normalized.s, '_')) as segment
            where segment = any (array[
                'con', 'cons', 'pute', 'putes', 'pd', 'pede', 'fdp', 'ntm',
                'nique', 'bite', 'chatte', 'suce', 'viol', 'nazi', 'nazis',
                'negro', 'cunt', 'dick', 'cock', 'fag', 'rape', 'rapist',
                'retard', 'sex', 'anal', 'support', 'staff', 'modo'
            ])
        );
$$;

revoke execute on function public.username_is_clean(text) from public;
grant execute on function public.username_is_clean(text) to anon, authenticated;

alter table public.profiles
    add constraint profiles_username_clean
    check (public.username_is_clean(username)) not valid;

-- Contrôle, sur chaque projet après le push : pseudos existants que le filtre
-- refuserait (à traiter à la main, cf. moderate_profile).
--   select id, username from public.profiles
--   where not public.username_is_clean(username);
