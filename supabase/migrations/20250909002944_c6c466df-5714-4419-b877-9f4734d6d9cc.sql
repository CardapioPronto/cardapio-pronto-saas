-- Fix critical security vulnerability: Restrict subscription creation to authorized systems only
-- Remove the overly permissive policy that allows any user to create fake subscriptions

-- Drop the vulnerable policy that allows anyone to insert subscriptions
DROP POLICY IF EXISTS "Allow all users to insert subscriptions" ON public.subscriptions;

-- Create secure policies for subscription management
-- Only allow service role (payment processing edge functions) to create subscriptions
CREATE POLICY "Service role can manage subscriptions" 
ON public.subscriptions 
FOR ALL 
TO service_role
USING (true);

-- Allow users to view their own restaurant's subscriptions only
CREATE POLICY "Users can view their restaurant subscriptions"
ON public.subscriptions
FOR SELECT
TO authenticated
USING (
  restaurant_id IN (
    SELECT r.id 
    FROM restaurants r 
    WHERE r.owner_id = auth.uid()
  )
);

-- Allow users to update status of their own restaurant's subscriptions (for cancellation)
CREATE POLICY "Users can update their restaurant subscription status"
ON public.subscriptions
FOR UPDATE
TO authenticated
USING (
  restaurant_id IN (
    SELECT r.id 
    FROM restaurants r 
    WHERE r.owner_id = auth.uid()
  )
)
WITH CHECK (
  restaurant_id IN (
    SELECT r.id 
    FROM restaurants r 
    WHERE r.owner_id = auth.uid()
  )
);