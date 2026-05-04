ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS avatar_url text,
ADD COLUMN IF NOT EXISTS avatar_storage_path text;

INSERT INTO storage.buckets (id, name, public)
VALUES ('user-avatars', 'user-avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Public can view user avatars" ON storage.objects;
CREATE POLICY "Public can view user avatars"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'user-avatars');

DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
CREATE POLICY "Users can upload their own avatar"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'user-avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
CREATE POLICY "Users can update their own avatar"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'user-avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'user-avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
CREATE POLICY "Users can delete their own avatar"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'user-avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE OR REPLACE FUNCTION public.delete_user_avatar_storage_objects()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $function$
BEGIN
  DELETE FROM storage.objects
  WHERE bucket_id = 'user-avatars'
    AND (storage.foldername(name))[1] = OLD.id::text;

  RETURN OLD;
END;
$function$;

DROP TRIGGER IF EXISTS delete_user_avatar_storage_objects_trigger ON public.users;
CREATE TRIGGER delete_user_avatar_storage_objects_trigger
BEFORE DELETE ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.delete_user_avatar_storage_objects();
