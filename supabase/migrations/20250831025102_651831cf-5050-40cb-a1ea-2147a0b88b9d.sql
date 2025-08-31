-- Ensure bucket exists and is public
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update set public = excluded.public;

-- Allow public read of images in the bucket (useful for public menus)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' 
      AND policyname = 'Public can read product images'
  ) THEN
    CREATE POLICY "Public can read product images"
    ON storage.objects
    FOR SELECT
    USING (bucket_id = 'product-images');
  END IF;
END $$;

-- Allow restaurant owners to upload images to a folder named with their restaurant_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' 
      AND policyname = 'Owners can upload product images'
  ) THEN
    CREATE POLICY "Owners can upload product images"
    ON storage.objects
    FOR INSERT
    WITH CHECK (
      bucket_id = 'product-images'
      AND EXISTS (
        SELECT 1 FROM public.restaurants r
        WHERE r.id::text = (storage.foldername(name))[1]
          AND r.owner_id = auth.uid()
      )
    );
  END IF;
END $$;

-- Allow restaurant owners to update images inside their own restaurant folder
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' 
      AND policyname = 'Owners can update product images'
  ) THEN
    CREATE POLICY "Owners can update product images"
    ON storage.objects
    FOR UPDATE
    USING (
      bucket_id = 'product-images'
      AND EXISTS (
        SELECT 1 FROM public.restaurants r
        WHERE r.id::text = (storage.foldername(name))[1]
          AND r.owner_id = auth.uid()
      )
    )
    WITH CHECK (
      bucket_id = 'product-images'
      AND EXISTS (
        SELECT 1 FROM public.restaurants r
        WHERE r.id::text = (storage.foldername(name))[1]
          AND r.owner_id = auth.uid()
      )
    );
  END IF;
END $$;

-- Allow restaurant owners to delete images inside their own restaurant folder
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' 
      AND policyname = 'Owners can delete product images'
  ) THEN
    CREATE POLICY "Owners can delete product images"
    ON storage.objects
    FOR DELETE
    USING (
      bucket_id = 'product-images'
      AND EXISTS (
        SELECT 1 FROM public.restaurants r
        WHERE r.id::text = (storage.foldername(name))[1]
          AND r.owner_id = auth.uid()
      )
    );
  END IF;
END $$;
