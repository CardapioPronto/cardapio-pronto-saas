import React, { useState } from 'react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useCoupons } from '@/hooks/useCoupons';
import { CouponFormData, generateCouponCode } from '@/types/coupons';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Copy,
  Trash2,
  Edit,
  Plus,
  Loader2,
  CheckCircle,
  AlertCircle,
  ToggleRight,
  ToggleLeft,
  TrendingUp,
} from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const CouponsManager: React.FC = () => {
  const { user, loading: userLoading } = useCurrentUser();
  const {
    coupons,
    loadingCoupons,
    statistics,
    createCoupon,
    updateCoupon,
    deleteCoupon,
    toggleCouponStatus,
  } = useCoupons(user?.restaurant_id ?? '');

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<string | null>(null);
  const [formData, setFormData] = useState<CouponFormData>({
    code: generateCouponCode(),
    title: '',
    description: '',
    discountType: 'percentage',
    discountValue: 10,
    validFrom: new Date(),
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    applicableTo: 'all',
    isActive: true,
  });

  if (userLoading || loadingCoupons) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const handleCreateCoupon = async () => {
    if (!formData.title.trim()) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Nome do cupom é obrigatório',
      });
      return;
    }

    try {
      await createCoupon.mutateAsync(formData);
      toast({
        title: 'Sucesso',
        description: 'Cupom criado com sucesso',
      });
      setIsCreateDialogOpen(false);
      setFormData({
        code: generateCouponCode(),
        title: '',
        description: '',
        discountType: 'percentage',
        discountValue: 10,
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        applicableTo: 'all',
        isActive: true,
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Erro ao criar cupom',
      });
    }
  };

  const handleDeleteCoupon = async (couponId: string) => {
    if (confirm('Tem certeza que deseja deletar este cupom?')) {
      try {
        await deleteCoupon.mutateAsync(couponId);
        toast({
          title: 'Sucesso',
          description: 'Cupom deletado com sucesso',
        });
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Erro',
          description: 'Erro ao deletar cupom',
        });
      }
    }
  };

  const handleToggleStatus = async (couponId: string, currentStatus: boolean) => {
    try {
      await toggleCouponStatus.mutateAsync({
        id: couponId,
        isActive: !currentStatus,
      });
      toast({
        title: 'Sucesso',
        description: `Cupom ${!currentStatus ? 'ativado' : 'desativado'}`,
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Erro ao atualizar status',
      });
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({
      title: 'Copiado',
      description: 'Código do cupom copiado para clipboard',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold mb-1 flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Gerenciador de Cupons
          </h3>
          <p className="text-sm text-muted-foreground">
            Crie e gerencie cupons desconto para seus clientes
          </p>
        </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Novo Cupom
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Criar Novo Cupom</DialogTitle>
              <DialogDescription>
                Configure os detalhes do cupom de desconto
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Código do Cupom */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="code">Código do Cupom</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      id="code"
                      value={formData.code}
                      onChange={(e) =>
                        setFormData({ ...formData, code: e.target.value })
                      }
                      placeholder="PROMO2024"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setFormData({ ...formData, code: generateCouponCode() })
                      }
                    >
                      Gerar
                    </Button>
                  </div>
                </div>

                <div>
                  <Label htmlFor="title">Nome do Cupom</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    placeholder="Desconto Especial"
                  />
                </div>
              </div>

              {/* Descrição */}
              <div>
                <Label htmlFor="description">Descrição (Opcional)</Label>
                <Input
                  id="description"
                  value={formData.description || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Descrição do cupom..."
                />
              </div>

              {/* Configuração de Desconto */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="discountType">Tipo de Desconto</Label>
                  <Select
                    value={formData.discountType}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        discountType: value as 'percentage' | 'fixed',
                      })
                    }
                  >
                    <SelectTrigger id="discountType">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentual (%)</SelectItem>
                      <SelectItem value="fixed">Valor Fixo (R$)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="discountValue">
                    Valor do Desconto
                    {formData.discountType === 'percentage' ? ' (%)' : ' (R$)'}
                  </Label>
                  <Input
                    id="discountValue"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={formData.discountValue}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        discountValue: parseFloat(e.target.value),
                      })
                    }
                  />
                </div>
              </div>

              {/* Datas de Validade */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="validFrom">Válido a partir de</Label>
                  <Input
                    id="validFrom"
                    type="datetime-local"
                    value={formData.validFrom.toISOString().slice(0, 16)}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        validFrom: new Date(e.target.value),
                      })
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="validUntil">Válido até</Label>
                  <Input
                    id="validUntil"
                    type="datetime-local"
                    value={formData.validUntil.toISOString().slice(0, 16)}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        validUntil: new Date(e.target.value),
                      })
                    }
                  />
                </div>
              </div>

              {/* Outras Configurações */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="maxUses">Usos Máximos (Opcional)</Label>
                  <Input
                    id="maxUses"
                    type="number"
                    min="1"
                    value={formData.maxUses || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        maxUses: e.target.value ? parseInt(e.target.value) : undefined,
                      })
                    }
                    placeholder="Sem limite"
                  />
                </div>

                <div>
                  <Label htmlFor="minOrderValue">Valor Mínimo do Pedido (R$)</Label>
                  <Input
                    id="minOrderValue"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.minimumOrderValue || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        minimumOrderValue: e.target.value
                          ? parseFloat(e.target.value)
                          : undefined,
                      })
                    }
                    placeholder="Sem mínimo"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  onClick={handleCreateCoupon}
                  disabled={createCoupon.isPending}
                >
                  {createCoupon.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Criando...
                    </>
                  ) : (
                    'Criar Cupom'
                  )}
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Estatísticas */}
      {statistics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total de Cupons</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.totalCoupons}</div>
              <p className="text-xs text-muted-foreground">
                {statistics.activeCoupons} ativos
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Utilizado</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.totalUsed}</div>
              <p className="text-xs text-muted-foreground">usos realizados</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Desconto Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                R$ {statistics.totalDiscountedAmount.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">em descontos</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Média por Cupom</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                R$ {statistics.averageDiscountPerCoupon.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">desconto médio</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Lista de Cupons */}
      {coupons.length === 0 ? (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Você ainda não criou nenhum cupom. Crie um novo cupom para começar.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="space-y-2">
          {coupons.map((coupon) => {
            const isExpired = new Date(coupon.valid_until) < new Date();
            const isStarted = new Date(coupon.valid_from) <= new Date();

            return (
              <Card key={coupon.id} className={isExpired ? 'opacity-50' : ''}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <code className="text-lg font-mono font-bold">{coupon.code}</code>
                        <Badge
                          variant={coupon.is_active && !isExpired ? 'default' : 'secondary'}
                        >
                          {!coupon.is_active
                            ? 'Inativo'
                            : isExpired
                              ? 'Expirado'
                              : 'Ativo'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {coupon.title}
                      </p>
                      {coupon.description && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {coupon.description}
                        </p>
                      )}
                    </div>

                    <div className="hidden md:flex flex-col text-right gap-1">
                      <div className="text-sm font-semibold">
                        {coupon.discount_type === 'percentage'
                          ? `${coupon.discount_value}%`
                          : `R$ ${coupon.discount_value.toFixed(2)}`}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(coupon.valid_until), 'dd/MM/yyyy', {
                          locale: ptBR,
                        })}
                      </div>
                      {coupon.max_uses && (
                        <div className="text-xs text-muted-foreground">
                          {coupon.usage_count}/{coupon.max_uses} usos
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopyCode(coupon.code)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          handleToggleStatus(coupon.id, !!coupon.is_active)
                        }
                        disabled={
                          toggleCouponStatus.isPending ||
                          (isExpired && !!coupon.is_active)
                        }
                      >
                        {coupon.is_active ? (
                          <ToggleRight className="h-4 w-4 text-green-600" />
                        ) : (
                          <ToggleLeft className="h-4 w-4" />
                        )}
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteCoupon(coupon.id)}
                        disabled={deleteCoupon.isPending}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Alert className="bg-blue-50 border-blue-200">
        <AlertCircle className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-900 text-sm">
          💡 Dica: Crie cupons com datas de validade curtas para criar senso de urgência e
          aumentar conversões.
        </AlertDescription>
      </Alert>
    </div>
  );
};
