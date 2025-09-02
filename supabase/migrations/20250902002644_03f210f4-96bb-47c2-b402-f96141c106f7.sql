-- Inserir temas padrão do menu se não existirem
INSERT INTO menu_themes (id, name, display_name, description, preview_image_url, is_active)
VALUES 
  ('550e8400-e29b-41d4-a716-446655440000', 'default', 'Tema Padrão', 'Tema limpo e moderno para qualquer tipo de estabelecimento', null, true),
  ('550e8400-e29b-41d4-a716-446655440001', 'modern', 'Tema Moderno', 'Design contemporâneo e minimalista com gradientes suaves', null, true),
  ('550e8400-e29b-41d4-a716-446655440002', 'elegant', 'Tema Elegante', 'Tema sofisticado para restaurantes refinados com tipografia elegante', null, true)
ON CONFLICT (id) DO NOTHING;