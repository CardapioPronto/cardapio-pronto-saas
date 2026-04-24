-- Insert Delivery theme and deactivate others
INSERT INTO public.menu_themes (name, display_name, description, is_active)
VALUES ('delivery', 'Delivery Moderno', 'Tema moderno focado em delivery, com checkout completo e acompanhamento em tempo real', true)
ON CONFLICT (name) DO UPDATE SET 
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  is_active = true;

UPDATE public.menu_themes SET is_active = false WHERE name <> 'delivery';