import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const MAX_ORIGINAL_IMAGE_SIZE = 15 * 1024 * 1024;
const MAX_UPLOAD_IMAGE_SIZE = 5 * 1024 * 1024;
const MAX_IMAGE_DIMENSION = 1600;
const IMAGE_QUALITY = 0.82;

const compressImage = async (file: File): Promise<File> => {
  if (file.type === 'image/gif') return file;

  const imageUrl = URL.createObjectURL(file);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = imageUrl;
    });

    const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(image.width, image.height));
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d');
    if (!context) return file;

    context.drawImage(image, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', IMAGE_QUALITY);
    });

    if (!blob || blob.size >= file.size) return file;

    const baseName = file.name.replace(/\.[^.]+$/, '');
    return new File([blob], `${baseName}.jpg`, {
      type: 'image/jpeg',
      lastModified: Date.now(),
    });
  } catch (error) {
    console.error('Error compressing image:', error);
    return file;
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
};

export const useImageUpload = (restaurantId: string) => {
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const uploadImage = async (file: File): Promise<{ publicUrl: string; path: string } | null> => {
    if (!file) return null;

    try {
      setUploading(true);

      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Erro",
          description: "Por favor, selecione apenas arquivos de imagem",
          variant: "destructive",
        });
        return null;
      }

      if (file.size > MAX_ORIGINAL_IMAGE_SIZE) {
        toast({
          title: "Erro",
          description: "A imagem original deve ter no máximo 15MB",
          variant: "destructive",
        });
        return null;
      }

      const uploadFile = await compressImage(file);

      if (uploadFile.size > MAX_UPLOAD_IMAGE_SIZE) {
        toast({
          title: "Erro",
          description: "A imagem deve ter no máximo 5MB após otimização",
          variant: "destructive",
        });
        return null;
      }

      // Generate unique filename
      const fileExt = uploadFile.name.split('.').pop();
      const fileName = `${restaurantId}/${Date.now()}.${fileExt}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('product-images')
        .upload(fileName, uploadFile, {
          contentType: uploadFile.type,
        });

      if (error) {
        console.error('Error uploading image:', error);
        toast({
          title: "Erro",
          description: "Erro ao fazer upload da imagem",
          variant: "destructive",
        });
        return null;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(data.path);

      toast({
        title: "Sucesso",
        description: "Imagem enviada com sucesso",
      });

      return { publicUrl, path: data.path };
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: "Erro",
        description: "Erro inesperado ao enviar imagem",
        variant: "destructive",
      });
      return null;
    } finally {
      setUploading(false);
    }
  };

  const deleteImage = async (imageUrlOrPath: string): Promise<boolean> => {
    try {
      let filePath = imageUrlOrPath;

      if (imageUrlOrPath.startsWith('http')) {
        const urlObj = new URL(imageUrlOrPath);
        const pathParts = urlObj.pathname.split('/');
        const bucketIndex = pathParts.findIndex((part) => part === 'product-images');
        filePath = bucketIndex >= 0
          ? pathParts.slice(bucketIndex + 1).join('/')
          : pathParts.slice(-2).join('/');
      }

      const { error } = await supabase.storage
        .from('product-images')
        .remove([filePath]);

      if (error) {
        console.error('Error deleting image:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error deleting image:', error);
      return false;
    }
  };

  return {
    uploadImage,
    deleteImage,
    uploading
  };
};
