-- Seed de deux utilisateurs de test confirmés pour scripts/e2e-auth.sh.
-- À exécuter sur le projet DEV uniquement (SQL editor ou MCP execute_sql).
-- Les inserts directs dans auth.users exigent identities + colonnes token non-null,
-- sinon GoTrue répond « Database error querying schema » au login.

delete from auth.users where email like 'e2e.%@trycast.local';

with new_users as (
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change, email_change_token_new,
    email_change_token_current, phone_change, phone_change_token, reauthentication_token
  )
  select
    '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
    'e2e.user' || n || '@trycast.local', crypt('motdepasse123', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}', jsonb_build_object('username', 'TestUser' || n),
    now(), now(), '', '', '', '', '', '', '', ''
  from generate_series(1, 2) as n
  returning id, email
)
insert into auth.identities (id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), id::text, id,
       jsonb_build_object('sub', id::text, 'email', email, 'email_verified', true),
       'email', now(), now(), now()
from new_users;
