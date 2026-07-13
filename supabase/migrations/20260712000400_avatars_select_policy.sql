-- Policy SELECT « son propre dossier » sur storage.objects, indispensable au
-- fonctionnement de l'upload et de la suppression de l'avatar.
--
-- Piège vérifié en E2E : l'API Storage réalise un SELECT d'existence sous la
-- RLS de l'utilisateur avant un upsert (upsert: true) ET avant un remove. Sans
-- policy SELECT, ce contrôle échoue et l'API renvoie « new row violates
-- row-level security policy » (403) — alors même que les policies INSERT/UPDATE
-- sont correctes. La lecture publique des avatars passe, elle, par l'URL
-- publique du bucket (public = true) qui court-circuite la RLS ; cette policy
-- ne sert donc qu'aux opérations d'écriture de l'utilisateur sur son dossier.

create policy "avatars_select_own"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
