-- Create storage bucket for product images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('product-images', 'product-images', true);

-- Create policies for product images
CREATE POLICY "Product images are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'product-images');

CREATE POLICY "Restaurant owners can upload product images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'product-images' AND 
  auth.uid() IN (
    SELECT r.owner_id 
    FROM restaurants r 
    WHERE r.id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Restaurant owners can update their product images" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'product-images' AND 
  auth.uid() IN (
    SELECT r.owner_id 
    FROM restaurants r 
    WHERE r.id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Restaurant owners can delete their product images" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'product-images' AND 
  auth.uid() IN (
    SELECT r.owner_id 
    FROM restaurants r 
    WHERE r.id::text = (storage.foldername(name))[1]
  )
);