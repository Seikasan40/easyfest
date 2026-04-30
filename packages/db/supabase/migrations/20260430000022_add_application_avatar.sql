-- Ajoute avatar_url à volunteer_applications (uploadée à l'inscription, pré-compte créé)
alter table public.volunteer_applications
  add column if not exists avatar_url text;

comment on column public.volunteer_applications.avatar_url is
  'Photo uploadée lors de l''inscription (Supabase Storage bucket avatars). Recopiée dans volunteer_profiles à la création du compte.';

-- ─── Bucket avatars (public-read pour affichage facile dans l'app) ─────
-- NOTE : à créer via Supabase Studio si pas auto-créé.
-- INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
-- VALUES ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg','image/png','image/webp'])
-- ON CONFLICT (id) DO UPDATE SET public = excluded.public;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Policy : anonymes peuvent uploader dans applications/* (form public)
drop policy if exists "anon_can_upload_application_avatars" on storage.objects;
create policy "anon_can_upload_application_avatars" on storage.objects
  for insert to anon, authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] in ('applications', 'profiles')
  );

-- Policy : tout le monde peut lire (bucket public)
drop policy if exists "anyone_can_read_avatars" on storage.objects;
create policy "anyone_can_read_avatars" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'avatars');

-- Policy : l'owner peut update sa propre photo (profils)
drop policy if exists "user_can_update_own_avatar" on storage.objects;
create policy "user_can_update_own_avatar" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = 'profiles'
    and (storage.foldername(name))[2] = auth.uid()::text
  );
