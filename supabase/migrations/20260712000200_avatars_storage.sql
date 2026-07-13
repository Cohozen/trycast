-- Bucket Storage des photos de profil. Public en lecture (les avatars
-- s'affichent partout, servis par l'URL publique du CDN sans JWT) ; l'écriture
-- est cloisonnée par utilisateur via des policies sur storage.objects :
-- chacun ne peut créer/remplacer/supprimer que dans son dossier `<userId>/`.
-- Le premier segment du chemin (storage.foldername(name))[1] doit égaler
-- l'uid de l'appelant. upsert côté client => on couvre insert ET update.
--
-- ⚠️ Piège db push : create policy sur storage.objects exige que le rôle du
-- push soit propriétaire de la table ; si le push échoue ici (ERROR: must be
-- owner of table objects), créer bucket + policies à la main dans le Dashboard
-- Storage (mêmes conditions) et marquer cette migration comme appliquée.

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "avatars_insert_own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "avatars_update_own"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "avatars_delete_own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
