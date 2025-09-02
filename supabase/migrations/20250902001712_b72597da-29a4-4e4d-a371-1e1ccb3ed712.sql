-- Relax storage policies temporarily: allow any authenticated user to upload and manage own files in product-images

-- Allow INSERT for any authenticated user
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' 
      AND policyname = 'Authenticated can upload product images'
  ) THEN
    CREATE POLICY "Authenticated can upload product images"
    ON storage.objects
    FOR INSERT
    WITH CHECK (
      bucket_id = 'product-images'
      AND auth.uid() IS NOT NULL
    );
  END IF;
END $$;

-- Allow UPDATE by the uploader (owner)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' 
      AND policyname = 'Authenticated can update own product images'
  ) THEN
    CREATE POLICY "Authenticated can update own product images"
    ON storage.objects
    FOR UPDATE
    USING (
      bucket_id = 'product-images' AND owner = auth.uid()
    )
    WITH CHECK (
      bucket_id = 'product-images' AND owner = auth.uid()
    );
  END IF;
END $$;

-- Allow DELETE by the uploader (owner)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' 
      AND policyname = 'Authenticated can delete own product images'
  ) THEN
    CREATE POLICY "Authenticated can delete own product images"
    ON storage.objects
    FOR DELETE
    USING (
      bucket_id = 'product-images' AND owner = auth.uid()
    );
  END IF;
END $$;