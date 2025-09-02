-- Storage policies: allow owners and employees to manage images within their restaurant folder
-- Ensure bucket exists and is public
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update set public = excluded.public;

-- Public read (if not already present)
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

-- Allow restaurant owners to upload (if not already present)
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

-- NEW: Allow employees and users linked to the restaurant to upload
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' 
      AND policyname = 'Members can upload product images'
  ) THEN
    CREATE POLICY "Members can upload product images"
    ON storage.objects
    FOR INSERT
    WITH CHECK (
      bucket_id = 'product-images'
      AND (
        -- Owner of restaurant
        EXISTS (
          SELECT 1 FROM public.restaurants r
          WHERE r.id::text = (storage.foldername(name))[1]
            AND r.owner_id = auth.uid()
        )
        OR
        -- Employee of restaurant
        EXISTS (
          SELECT 1 FROM public.employees e
          WHERE e.user_id = auth.uid()
            AND e.restaurant_id::text = (storage.foldername(name))[1]
        )
        OR
        -- Any user with restaurant_id linked
        EXISTS (
          SELECT 1 FROM public.users u
          WHERE u.id = auth.uid()
            AND u.restaurant_id::text = (storage.foldername(name))[1]
        )
      )
    );
  END IF;
END $$;

-- Allow updates by members
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' 
      AND policyname = 'Members can update product images'
  ) THEN
    CREATE POLICY "Members can update product images"
    ON storage.objects
    FOR UPDATE
    USING (
      bucket_id = 'product-images'
      AND (
        EXISTS (
          SELECT 1 FROM public.restaurants r
          WHERE r.id::text = (storage.foldername(name))[1]
            AND r.owner_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1 FROM public.employees e
          WHERE e.user_id = auth.uid()
            AND e.restaurant_id::text = (storage.foldername(name))[1]
        )
        OR EXISTS (
          SELECT 1 FROM public.users u
          WHERE u.id = auth.uid()
            AND u.restaurant_id::text = (storage.foldername(name))[1]
        )
      )
    )
    WITH CHECK (
      bucket_id = 'product-images'
      AND (
        EXISTS (
          SELECT 1 FROM public.restaurants r
          WHERE r.id::text = (storage.foldername(name))[1]
            AND r.owner_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1 FROM public.employees e
          WHERE e.user_id = auth.uid()
            AND e.restaurant_id::text = (storage.foldername(name))[1]
        )
        OR EXISTS (
          SELECT 1 FROM public.users u
          WHERE u.id = auth.uid()
            AND u.restaurant_id::text = (storage.foldername(name))[1]
        )
      )
    );
  END IF;
END $$;

-- Allow deletes by members
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' 
      AND policyname = 'Members can delete product images'
  ) THEN
    CREATE POLICY "Members can delete product images"
    ON storage.objects
    FOR DELETE
    USING (
      bucket_id = 'product-images'
      AND (
        EXISTS (
          SELECT 1 FROM public.restaurants r
          WHERE r.id::text = (storage.foldername(name))[1]
            AND r.owner_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1 FROM public.employees e
          WHERE e.user_id = auth.uid()
            AND e.restaurant_id::text = (storage.foldername(name))[1]
        )
        OR EXISTS (
          SELECT 1 FROM public.users u
          WHERE u.id = auth.uid()
            AND u.restaurant_id::text = (storage.foldername(name))[1]
        )
      )
    );
  END IF;
END $$;
