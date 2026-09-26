-- Chantier C de la 1.3.0 : e-mail de bienvenue des comptes Google et Apple.
--
-- Un compte créé par e-mail reçoit déjà l'e-mail de confirmation ; un compte
-- créé par un fournisseur ne recevait rien. Aucun e-mail natif de Supabase Auth
-- ne couvre ce cas : « Sign-in method linked » (identity_linked_notification)
-- ne part que de linkIdentity() sur un utilisateur déjà connecté, jamais à la
-- création d'un compte par Google ou Apple (vérifié dans le source de
-- supabase/auth, internal/api/identity.go et external.go).
--
-- Déclencheur : le passage de username_chosen de false à true. Seule
-- claim_username le fait, au premier choix du pseudo, et le pseudo est alors
-- connu. Un compte e-mail naît avec username_chosen = true (handle_new_user,
-- 20260723000200) et ne passe jamais par là. Les comptes de démo sont exclus :
-- seed-demo-account.mjs pose username_chosen et is_demo dans le même update.
--
-- ponytail: un profil modéré (moderate_profile remet username_chosen à false)
-- reçoit de nouveau la bienvenue quand il rechoisit son pseudo. Rare et sans
-- gravité ; une colonne welcomed_at réglerait le cas si un jour il gêne.
--
-- Envoi par l'API Resend en pg_net, comme notify_user_report
-- (20260926000200) : même clé resend_api_key du Vault, rien ne part si elle
-- manque. Le contenu est le template Resend publié sous l'alias « welcome »,
-- généré par scripts/build-email-templates.mjs (docs/emails/welcome.html) :
-- retoucher l'e-mail ne demande pas de migration. Template absent ou non
-- publié : Resend répond 422, visible dans net._http_response, et rien ne part.
-- L'e-mail part de noreply@, comme les e-mails d'auth.

create or replace function public.send_welcome_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_key text;
    v_email text;
begin
    select decrypted_secret into v_key
    from vault.decrypted_secrets
    where name = 'resend_api_key';
    if v_key is null then
        return new;
    end if;

    select email into v_email from auth.users where id = new.id;
    if v_email is null then
        return new;
    end if;

    perform net.http_post(
        url := 'https://api.resend.com/emails',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || v_key
        ),
        body := jsonb_build_object(
            'from', 'TryCast <noreply@trycast.fr>',
            'to', jsonb_build_array(v_email),
            'subject', 'Bienvenue sur TryCast',
            'template', jsonb_build_object(
                'id', 'welcome',
                'variables', jsonb_build_object('USERNAME', new.username)
            )
        ),
        timeout_milliseconds := 10000
    );
    return new;
end;
$$;

revoke execute on function public.send_welcome_email() from public, anon, authenticated;

create trigger profiles_welcome_email
    after update of username_chosen on public.profiles
    for each row
    when (old.username_chosen = false and new.username_chosen = true and not new.is_demo)
    execute function public.send_welcome_email();
