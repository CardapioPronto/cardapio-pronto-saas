-- Create areas table
CREATE TABLE public.areas (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    restaurant_id uuid NOT NULL,
    description text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Create mesas table
CREATE TABLE public.mesas (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    number text NOT NULL,
    area_id uuid REFERENCES public.areas(id) ON DELETE CASCADE,
    restaurant_id uuid NOT NULL,
    capacity integer DEFAULT 4,
    status text DEFAULT 'livre' NOT NULL, -- livre, ocupada, reservada, indisponivel
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mesas ENABLE ROW LEVEL SECURITY;

-- RLS policies for areas
CREATE POLICY "Users can view their restaurant's areas"
ON public.areas FOR SELECT
USING (
  restaurant_id IN (
    SELECT id FROM public.restaurants
    WHERE owner_id = auth.uid()
  )
);

CREATE POLICY "Users can insert areas to their restaurants"
ON public.areas FOR INSERT
WITH CHECK (
  restaurant_id IN (
    SELECT id FROM public.restaurants
    WHERE owner_id = auth.uid()
  )
);

CREATE POLICY "Users can update their restaurant's areas"
ON public.areas FOR UPDATE
USING (
  restaurant_id IN (
    SELECT id FROM public.restaurants
    WHERE owner_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their restaurant's areas"
ON public.areas FOR DELETE
USING (
  restaurant_id IN (
    SELECT id FROM public.restaurants
    WHERE owner_id = auth.uid()
  )
);

-- RLS policies for mesas
CREATE POLICY "Users can view their restaurant's mesas"
ON public.mesas FOR SELECT
USING (
  restaurant_id IN (
    SELECT id FROM public.restaurants
    WHERE owner_id = auth.uid()
  )
);

CREATE POLICY "Users can insert mesas to their restaurants"
ON public.mesas FOR INSERT
WITH CHECK (
  restaurant_id IN (
    SELECT id FROM public.restaurants
    WHERE owner_id = auth.uid()
  )
);

CREATE POLICY "Users can update their restaurant's mesas"
ON public.mesas FOR UPDATE
USING (
  restaurant_id IN (
    SELECT id FROM public.restaurants
    WHERE owner_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their restaurant's mesas"
ON public.mesas FOR DELETE
USING (
  restaurant_id IN (
    SELECT id FROM public.restaurants
    WHERE owner_id = auth.uid()
  )
);

-- Super admin policies
CREATE POLICY "Super admins can access all areas"
ON public.areas FOR ALL
USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can access all mesas"
ON public.mesas FOR ALL
USING (is_super_admin(auth.uid()));

-- Create updated_at triggers
CREATE TRIGGER update_areas_updated_at
BEFORE UPDATE ON public.areas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_mesas_updated_at
BEFORE UPDATE ON public.mesas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_areas_restaurant_id ON public.areas(restaurant_id);
CREATE INDEX idx_mesas_restaurant_id ON public.mesas(restaurant_id);
CREATE INDEX idx_mesas_area_id ON public.mesas(area_id);
CREATE INDEX idx_mesas_status ON public.mesas(status);