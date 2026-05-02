import React, { useState } from 'react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import {
  useProductPerformance,
  useCategoryPerformance,
  usePerformanceSummary,
  PERFORMANCE_PERIODS,
  type PerformancePeriod,
} from '@/hooks/useProductPerformance';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  DollarSign,
  Loader2,
  AlertCircle,
  BarChart3,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const PerformanceDashboard: React.FC = () => {
  const { user, loading: userLoading } = useCurrentUser();
  const [selectedPeriod, setSelectedPeriod] = useState<PerformancePeriod>(
    PERFORMANCE_PERIODS[2]
  ); // Default: month

  const {
    data: productPerformance,
    isLoading: loadingProducts,
  } = useProductPerformance(user?.restaurant_id ?? '', selectedPeriod);

  const {
    data: categoryPerformance,
    isLoading: loadingCategories,
  } = useCategoryPerformance(user?.restaurant_id ?? '', selectedPeriod);

  const {
    data: summary,
    isLoading: loadingSummary,
  } = usePerformanceSummary(user?.restaurant_id ?? '', selectedPeriod);

  if (userLoading || loadingProducts || loadingCategories || loadingSummary) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!summary || summary.totalOrders === 0) {
    return (
      <Alert variant="default">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Nenhum pedido registrado neste período. Os dados de performance aparecerão
          assim que você receber seus primeiros pedidos.
        </AlertDescription>
      </Alert>
    );
  }

  const isGrowthPositive = summary.growth >= 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold mb-1 flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Análise de Performance
          </h3>
          <p className="text-sm text-muted-foreground">
            Visualize o desempenho dos seus produtos e categorias
          </p>
        </div>

        <Select
          value={selectedPeriod.period}
          onValueChange={(value) => {
            const period = PERFORMANCE_PERIODS.find((p) => p.period === value);
            if (period) setSelectedPeriod(period);
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PERFORMANCE_PERIODS.map((period) => (
              <SelectItem key={period.period} value={period.period}>
                {period.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total de Pedidos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <div className="text-2xl font-bold">{summary.totalOrders}</div>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">{selectedPeriod.label}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <div className="text-2xl font-bold">
                R$ {summary.totalRevenue.toFixed(2)}
              </div>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">faturado</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ {summary.averageOrderValue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">por pedido</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Crescimento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <div
                className={`text-2xl font-bold ${
                  isGrowthPositive ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {isGrowthPositive ? '+' : ''}{summary.growth}%
              </div>
              {isGrowthPositive ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600" />
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">vs período anterior</p>
          </CardContent>
        </Card>
      </div>

      {/* Top Products */}
      <Card>
        <CardHeader>
          <CardTitle>Produtos Mais Vendidos</CardTitle>
          <CardDescription>
            Top 10 produtos por receita em {selectedPeriod.label.toLowerCase()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {productPerformance && productPerformance.length > 0 ? (
            <div className="space-y-3">
              {productPerformance.slice(0, 10).map((product, index) => (
                <div
                  key={product.productId}
                  className="flex items-center justify-between pb-3 border-b last:border-b-0 last:pb-0"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Badge variant="outline" className="flex-shrink-0">
                      #{index + 1}
                    </Badge>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{product.productName}</p>
                      <p className="text-xs text-muted-foreground">
                        {product.quantitySold} unidades • {product.orderCount} pedidos
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-semibold">R$ {product.totalRevenue.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">
                      R$ {product.averagePrice.toFixed(2)}/un
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Nenhum produto vendido neste período
            </p>
          )}
        </CardContent>
      </Card>

      {/* Top Categories */}
      <Card>
        <CardHeader>
          <CardTitle>Categorias Mais Lucrativos</CardTitle>
          <CardDescription>
            Top categorias por receita em {selectedPeriod.label.toLowerCase()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {categoryPerformance && categoryPerformance.length > 0 ? (
            <div className="space-y-3">
              {categoryPerformance.map((category, index) => {
                const percentage = Math.round(
                  (category.totalRevenue /
                    categoryPerformance.reduce((sum, c) => sum + c.totalRevenue, 0)) *
                    100
                );

                return (
                  <div
                    key={category.categoryId}
                    className="space-y-2 pb-3 border-b last:border-b-0 last:pb-0"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="flex-shrink-0">
                          #{index + 1}
                        </Badge>
                        <p className="font-medium">{category.categoryName}</p>
                      </div>
                      <p className="font-semibold">R$ {category.totalRevenue.toFixed(2)}</p>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-blue-600 h-full"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-muted-foreground">
                        {percentage}%
                      </span>
                    </div>

                    <p className="text-xs text-muted-foreground">
                      {category.quantitySold} unidades • {category.orderCount} pedidos
                    </p>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Nenhuma categoria com vendas neste período
            </p>
          )}
        </CardContent>
      </Card>

      <Alert className="bg-blue-50 border-blue-200">
        <AlertCircle className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-900 text-sm">
          💡 Dica: Use estes dados para otimizar seu cardápio. Promova produtos com menor
          performance e considere ajustar preços dos mais populares.
        </AlertDescription>
      </Alert>
    </div>
  );
};
