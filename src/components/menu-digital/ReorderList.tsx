import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, GripVertical, ChevronUp, ChevronDown } from 'lucide-react';
import { toast } from '@/components/ui/sonner';

export interface DraggableItem {
  id: string;
  name: string;
  order_position: number;
}

interface ReorderListProps {
  items: DraggableItem[];
  title: string;
  description?: string;
  onReorder: (items: Array<{ id: string; order_position: number }>) => Promise<void>;
  isLoading?: boolean;
}

export const ReorderList: React.FC<ReorderListProps> = ({
  items,
  title,
  description,
  onReorder,
  isLoading = false,
}) => {
  const [localItems, setLocalItems] = useState<DraggableItem[]>(
    [...items].sort((a, b) => (a.order_position || 0) - (b.order_position || 0))
  );
  const [isDragging, setIsDragging] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleDragStart = (index: number) => {
    setIsDragging(true);
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newItems = Array.from(localItems);
    const draggedItem = newItems[draggedIndex];
    newItems.splice(draggedIndex, 1);
    newItems.splice(index, 0, draggedItem);

    setLocalItems(newItems);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    setDraggedIndex(null);
  };

  const moveUp = (index: number) => {
    if (index <= 0) return;
    const newItems = Array.from(localItems);
    [newItems[index - 1], newItems[index]] = [newItems[index], newItems[index - 1]];
    setLocalItems(newItems);
  };

  const moveDown = (index: number) => {
    if (index >= localItems.length - 1) return;
    const newItems = Array.from(localItems);
    [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
    setLocalItems(newItems);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const reorderedItems = localItems.map((item, index) => ({
        id: item.id,
        order_position: index,
      }));
      await onReorder(reorderedItems);
    } catch (error) {
      console.error('Error saving order:', error);
      // Reset to original order
      setLocalItems([...items].sort((a, b) => (a.order_position || 0) - (b.order_position || 0)));
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setLocalItems([...items].sort((a, b) => (a.order_position || 0) - (b.order_position || 0)));
  };

  const hasChanges = JSON.stringify(localItems.map((i) => i.id)) !== JSON.stringify(items.sort((a, b) => (a.order_position || 0) - (b.order_position || 0)).map((i) => i.id));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-4">
        {localItems.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Nenhum item para reordenar</p>
        ) : (
          <>
            <div className="space-y-2 mb-4">
              {localItems.map((item, index) => (
                <div
                  key={item.id}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`flex items-center gap-3 p-3 rounded border transition-colors ${
                    isDragging && draggedIndex === index
                      ? 'bg-blue-50 border-blue-300'
                      : 'bg-muted hover:bg-muted/80 border-border cursor-move'
                  }`}
                >
                  <GripVertical className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  <span className="flex-1 font-medium text-sm">{item.name}</span>
                  
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => moveUp(index)}
                      disabled={index === 0 || isLoading || isSaving}
                      title="Mover para cima"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => moveDown(index)}
                      disabled={index === localItems.length - 1 || isLoading || isSaving}
                      title="Mover para baixo"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2 pt-4 border-t">
              <Button
                onClick={handleSave}
                disabled={!hasChanges || isSaving || isLoading}
                size="sm"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  'Salvar Ordem'
                )}
              </Button>
              {hasChanges && (
                <Button
                  onClick={handleReset}
                  variant="outline"
                  disabled={isSaving || isLoading}
                  size="sm"
                >
                  Desfazer
                </Button>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
