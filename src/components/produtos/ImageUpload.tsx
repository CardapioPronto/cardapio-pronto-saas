import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, X } from 'lucide-react';
import { useImageUpload } from '@/hooks/useImageUpload';
import produtoPadrao from '@/assets/produto-padrao.jpg';

interface ImageUploadProps {
  currentImageUrl?: string;
  onImageChange: (image: { imageUrl: string | null; storagePath: string | null }) => void;
  restaurantId: string;
}

export const ImageUpload = ({ 
  currentImageUrl, 
  onImageChange, 
  restaurantId 
}: ImageUploadProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl || null);
  const { uploadImage, uploading } = useImageUpload(restaurantId);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Show preview immediately
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    // Upload file
    const uploadedImage = await uploadImage(file);
    
    if (uploadedImage) {
      onImageChange({
        imageUrl: uploadedImage.publicUrl,
        storagePath: uploadedImage.path,
      });
      setPreviewUrl(uploadedImage.publicUrl);
    } else {
      // Reset preview on error
      setPreviewUrl(currentImageUrl || null);
    }

    // Clean up object URL
    URL.revokeObjectURL(objectUrl);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = () => {
    onImageChange({ imageUrl: null, storagePath: null });
    setPreviewUrl(null);
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const displayImage = previewUrl || produtoPadrao;

  return (
    <div className="space-y-4">
      <Label>Imagem do Produto</Label>
      
      <div className="flex flex-col items-center space-y-4">
        {/* Image Preview */}
        <div className="relative w-48 h-32 border-2 border-dashed border-border rounded-lg overflow-hidden">
          <img
            src={displayImage}
            alt="Preview do produto"
            className="w-full h-full object-cover"
          />
          
          {previewUrl && previewUrl !== produtoPadrao && (
            <button
              type="button"
              onClick={handleRemoveImage}
              className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/80 transition-colors"
              disabled={uploading}
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Upload Button */}
        <Button
          type="button"
          variant="outline"
          onClick={triggerFileInput}
          disabled={uploading}
          className="flex items-center gap-2"
        >
          {uploading ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Enviando...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4" />
              {previewUrl && previewUrl !== produtoPadrao ? 'Alterar Imagem' : 'Adicionar Imagem'}
            </>
          )}
        </Button>

        {/* Hidden File Input */}
        <Input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />

        <p className="text-xs text-muted-foreground text-center">
          Formatos aceitos: JPG, PNG, GIF<br />
          Tamanho máximo: 5MB
        </p>
      </div>
    </div>
  );
};
