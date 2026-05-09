import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, GripVertical, ChevronUp, ChevronDown, Search } from 'lucide-react';
import { toast } from '@/components/ui/sonner-toast';

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

const sortOrderItems = (items: DraggableItem[]) =>
  [...items].sort((a, b) => {
    const positionDiff = (a.order_position ?? Number.MAX_SAFE_INTEGER) - (b.order_position ?? Number.MAX_SAFE_INTEGER);
    if (positionDiff !== 0) return positionDiff;
    return a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' });
  });

export const ReorderList: React.FC<ReorderListProps> = ({
  items,
  title,
  description,
  onReorder,
  isLoading = false,
}) => {
  const [localItems, setLocalItems] = useState<DraggableItem[]>(sortOrderItems(items));
  const [isDragging, setIsDragging] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [search, setSearch] = useState('');

  const sortedItems = useMemo(() => sortOrderItems(items), [items]);

  const normalizedSearch = search.trim().toLowerCase();
  const visibleItems = normalizedSearch
    ? localItems.filter((item) => item.name.toLowerCase().includes(normalizedSearch))
    : localItems;

  useEffect(() => {
    if (isSaving || isDragging || isDirty) return;
    setLocalItems(sortedItems);
  }, [isDirty, isDragging, isSaving, sortedItems]);

  const getLocalIndex = (id: string) => localItems.findIndex((item) => item.id === id);

  const handleDragStart = (index: number) => {
    if (normalizedSearch) return;
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
    setIsDirty(true);
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
    setIsDirty(true);
  };

  const moveDown = (index: number) => {
    if (index >= localItems.length - 1) return;
    const newItems = Array.from(localItems);
    [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
    setLocalItems(newItems);
    setIsDirty(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const reorderedItems = localItems.map((item, index) => ({
        id: item.id,
        order_position: index,
      }));
      await onReorder(reorderedItems);
      setLocalItems(localItems.map((item, index) => ({ ...item, order_position: index })));
      setIsDirty(false);
      toast.success('Ordem salva com sucesso.');
    } catch (error) {
      console.error('Error saving order:', error);
      toast.error(error instanceof Error ? error.message : 'Não foi possível salvar a ordem.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setLocalItems(sortedItems);
    setIsDirty(false);
  };

  const hasChanges = isDirty || JSON.stringify(localItems.map((i) => i.id)) !== JSON.stringify(sortedItems.map((i) => i.id));

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          <div className="relative w-full lg:w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar item"
              className="pl-8"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 p-4">
        {isLoading ? (
          <div className="flex min-h-48 items-center justify-center text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Carregando itens...
          </div>
        ) : localItems.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Nenhum item para reordenar</p>
        ) : visibleItems.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Nenhum item encontrado para a busca</p>
        ) : (
          <>
            {normalizedSearch && (
              <p className="rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                A movimentação por arrastar fica disponível sem filtro aplicado.
              </p>
            )}

            <div className="dashboard-scrollbar mb-4 max-h-[460px] space-y-2 overflow-y-auto pr-1">
              {visibleItems.map((item) => {
                const index = getLocalIndex(item.id);
                return (
                  <div
                    key={item.id}
                    draggable={!normalizedSearch}
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                    className={`flex items-center gap-3 p-3 rounded border transition-colors ${
                      isDragging && draggedIndex === index
                        ? 'bg-blue-50 border-blue-300'
                        : `bg-muted hover:bg-muted/80 border-border ${normalizedSearch ? '' : 'cursor-move'}`
                    }`}
                  >
                    <GripVertical className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    <span className="w-8 shrink-0 text-center text-xs text-muted-foreground">
                      {index + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate font-medium text-sm" title={item.name}>
                      {item.name}
                    </span>

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
                );
              })}
            </div>

            <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground">
                Mostrando {visibleItems.length} de {localItems.length} itens
              </p>
              <div className="flex gap-2">
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
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
