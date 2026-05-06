import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Check, X, Loader2, Copy } from 'lucide-react';
import { toast } from '@/components/ui/sonner';

interface SlugEditorProps {
  restaurantId: string;
  currentSlug?: string;
  onSlugUpdate?: (newSlug: string) => void;
}

// Normalize and validate slug format
const normalizeSlug = (input: string): string => {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^\w\-]/g, '') // Remove special characters except hyphens
    .replace(/\-+/g, '-') // Replace multiple hyphens with single
    .replace(/^\-|\-$/g, ''); // Remove leading/trailing hyphens
};

// Check if slug is valid (minimum 3 chars, no spaces)
const isSlugValid = (slug: string): boolean => {
  return slug.length >= 3 && /^[a-z0-9\-]+$/.test(slug);
};

export const SlugEditor: React.FC<SlugEditorProps> = ({
  restaurantId,
  currentSlug = '',
  onSlugUpdate,
}) => {
  const [slug, setSlug] = useState(currentSlug);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Check slug availability
  const checkSlugAvailability = async (checkSlug: string) => {
    if (!isSlugValid(checkSlug)) {
      setSlugAvailable(false);
      setError('Slug deve ter pelo menos 3 caracteres e conter apenas letras, números e hífens');
      return;
    }

    setIsChecking(true);
    setError(null);

    try {
      const { data, error: checkError } = await supabase
        .from('restaurants')
        .select('id')
        .eq('slug', checkSlug)
        .neq('id', restaurantId)
        .maybeSingle();

      if (checkError) {
        throw checkError;
      }

      if (data) {
        setSlugAvailable(false);
        setError('Este slug já está sendo usado por outro restaurante');
      } else {
        setSlugAvailable(true);
        setError(null);
      }
    } catch (err) {
      console.error('Error checking slug availability:', err);
      setError('Erro ao verificar disponibilidade');
      setSlugAvailable(null);
    } finally {
      setIsChecking(false);
    }
  };

  // Handle slug input change
  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const normalized = normalizeSlug(e.target.value);
    setSlug(normalized);
    setSlugAvailable(null);
    setError(null);
  };

  // Validate on blur
  const handleSlugBlur = () => {
    if (slug && slug !== currentSlug) {
      checkSlugAvailability(slug);
    }
  };

  // Save slug
  const handleSaveSlug = async () => {
    if (!isSlugValid(slug)) {
      setError('Slug inválido');
      return;
    }

    if (slug === currentSlug) {
      setIsEditing(false);
      return;
    }

    if (!slugAvailable) {
      setError('Este slug não está disponível');
      return;
    }

    setIsSaving(true);

    try {
      const { error: updateError } = await supabase
        .from('restaurants')
        .update({ slug })
        .eq('id', restaurantId);

      if (updateError) {
        throw updateError;
      }

      toast.success('Slug atualizado com sucesso!');
      setIsEditing(false);
      onSlugUpdate?.(slug);
    } catch (err) {
      console.error('Error updating slug:', err);
      setError('Erro ao atualizar slug');
      toast.error('Erro ao atualizar slug');
    } finally {
      setIsSaving(false);
    }
  };

  // Copy menu URL to clipboard
  const handleCopyUrl = () => {
    const url = `https://pubfy.com.br/cardapio/${slug}`;
    navigator.clipboard.writeText(url);
    toast.success('URL copiada para a área de transferência!');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Slug do Cardápio Digital</CardTitle>
        <CardDescription>
          URL amigável para compartilhar seu cardápio digital
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isEditing ? (
          <div className="space-y-2">
            <Label>URL Pública</Label>
            <div className="flex items-center gap-2">
              <div className="flex-1 px-3 py-2 bg-muted rounded border text-sm truncate">
                <span className="text-muted-foreground">cardapio.pronto.com.br/</span>
                <span className="font-semibold">{slug || restaurantId}</span>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCopyUrl}
                title="Copiar URL completa"
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setIsEditing(true);
                  setSlugAvailable(null);
                  setError(null);
                }}
              >
                Editar
              </Button>
            </div>
            {slug && (
              <p className="text-xs text-muted-foreground">
                Compartilhe esta URL para permitir que clientes acessem seu cardápio
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <Label htmlFor="slug-input">Novo Slug</Label>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="flex-1 flex items-center border rounded">
                  <span className="px-3 py-2 text-muted-foreground text-sm">cardapio.pronto.com.br/</span>
                  <Input
                    id="slug-input"
                    value={slug}
                    onChange={handleSlugChange}
                    onBlur={handleSlugBlur}
                    placeholder="seu-slug-aqui"
                    className="border-0 flex-1"
                    disabled={isSaving}
                  />
                  {isChecking && <Loader2 className="h-4 w-4 mr-3 animate-spin" />}
                  {!isChecking && slugAvailable === true && (
                    <Check className="h-4 w-4 mr-3 text-green-600" />
                  )}
                  {!isChecking && slugAvailable === false && (
                    <X className="h-4 w-4 mr-3 text-red-600" />
                  )}
                </div>
              </div>

              {error && (
                <Alert variant="destructive" className="py-2">
                  <AlertDescription className="text-xs">{error}</AlertDescription>
                </Alert>
              )}

              {slugAvailable === true && (
                <Alert className="py-2 border-green-600 bg-green-50">
                  <AlertDescription className="text-xs text-green-700">
                    ✓ Slug disponível
                  </AlertDescription>
                </Alert>
              )}

              <p className="text-xs text-muted-foreground">
                Use apenas letras minúsculas, números e hífens. Mínimo 3 caracteres.
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleSaveSlug}
                disabled={!slugAvailable || isSaving || slug === currentSlug}
                size="sm"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  'Salvar'
                )}
              </Button>
              <Button
                onClick={() => {
                  setIsEditing(false);
                  setSlug(currentSlug);
                  setSlugAvailable(null);
                  setError(null);
                }}
                variant="outline"
                size="sm"
                disabled={isSaving}
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
