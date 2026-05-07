-- Fix product-images Storage write policies to validate the object path, not restaurant/user names.
-- Product image paths are expected to be: {restaurant_id}/{filename}.

DROP POLICY IF EXISTS "Authenticated can upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can update own product images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can delete own product images" ON storage.objects;

DROP POLICY IF EXISTS "Members can upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Members can update product images" ON storage.objects;
DROP POLICY IF EXISTS "Members can delete product images" ON storage.objects;

DROP POLICY IF EXISTS "Owners can upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Owners can update product images" ON storage.objects;
DROP POLICY IF EXISTS "Owners can delete product images" ON storage.objects;

DROP POLICY IF EXISTS "Restaurant owners can upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Restaurant owners can update their product images" ON storage.objects;
DROP POLICY IF EXISTS "Restaurant owners can delete their product images" ON storage.objects;

CREATE POLICY "Members can upload product images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'product-images'
  AND (
    public.is_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.restaurants r
      WHERE r.id::text = (storage.foldername(objects.name))[1]
        AND r.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.id = auth.uid()
        AND u.restaurant_id::text = (storage.foldername(objects.name))[1]
    )
    OR EXISTS (
      SELECT 1
      FROM public.employees e
      WHERE e.user_id = auth.uid()
        AND e.is_active = true
        AND e.restaurant_id::text = (storage.foldername(objects.name))[1]
    )
  )
);

CREATE POLICY "Members can update product images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'product-images'
  AND (
    public.is_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.restaurants r
      WHERE r.id::text = (storage.foldername(objects.name))[1]
        AND r.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.id = auth.uid()
        AND u.restaurant_id::text = (storage.foldername(objects.name))[1]
    )
    OR EXISTS (
      SELECT 1
      FROM public.employees e
      WHERE e.user_id = auth.uid()
        AND e.is_active = true
        AND e.restaurant_id::text = (storage.foldername(objects.name))[1]
    )
  )
)
WITH CHECK (
  bucket_id = 'product-images'
  AND (
    public.is_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.restaurants r
      WHERE r.id::text = (storage.foldername(objects.name))[1]
        AND r.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.id = auth.uid()
        AND u.restaurant_id::text = (storage.foldername(objects.name))[1]
    )
    OR EXISTS (
      SELECT 1
      FROM public.employees e
      WHERE e.user_id = auth.uid()
        AND e.is_active = true
        AND e.restaurant_id::text = (storage.foldername(objects.name))[1]
    )
  )
);

CREATE POLICY "Members can delete product images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'product-images'
  AND (
    public.is_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.restaurants r
      WHERE r.id::text = (storage.foldername(objects.name))[1]
        AND r.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.id = auth.uid()
        AND u.restaurant_id::text = (storage.foldername(objects.name))[1]
    )
    OR EXISTS (
      SELECT 1
      FROM public.employees e
      WHERE e.user_id = auth.uid()
        AND e.is_active = true
        AND e.restaurant_id::text = (storage.foldername(objects.name))[1]
    )
  )
);
