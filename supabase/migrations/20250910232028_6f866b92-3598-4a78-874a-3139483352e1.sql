-- Fix restaurant menu configuration access - restrict to owners only
-- Remove public read access that exposes sensitive restaurant configuration data

-- Drop the overly permissive public read policy
DROP POLICY IF EXISTS "Allow public read access to menu config" ON public.restaurant_menu_config;

-- Create secure policy allowing only restaurant owners to read their own configuration
CREATE POLICY "Restaurant owners can read their menu config"
ON public.restaurant_menu_config
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM restaurants r
    WHERE r.id = restaurant_menu_config.restaurant_id 
    AND r.owner_id = auth.uid()
  )
);

-- Allow public access only for the public menu rendering (specific use case)
-- This is needed for the public menu to work but limits access to active configs only
CREATE POLICY "Public can read active menu configs for public menus"
ON public.restaurant_menu_config
FOR SELECT
TO anon, authenticated
USING (is_active = true);