import { useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useRestaurantAccess } from "@/hooks/useRestaurantAccess";
import { useMetricsOverview } from "@/hooks/useMetricsOverview";
import { formatarMoeda } from "@/utils/dashboardUtils";
import { RefreshCw, Store, TableIcon, ShoppingBasket, Users } from "lucide-react";

const PERIODS = [
  { days: 7, label: "7 dias" },
  { days: 30, label: "30 dias" },
  { days: 90, label: "90 dias" },
];

const ORDER_TYPE_LABELS: Record<string, string> = {
  mesa: "Mesa",
  balcao: "Balcão",
  delivery: "Delivery",
  retirada: "Retirada",
  outros: "Outros",
};

const TABLE_STATUS_LABELS: Record<string, string> = {
  available: "Livre",
  livre: "Livre",
  occupied: "Ocupada",
  ocupada: "Ocupada",
  reserved: "Reservada",
  reservada: "Reservada",
  unavailable: "Indisponível",
};

const MetricCard = ({
  title,
  value,
  hint,
}: {
  title: string;
  value: string;
  hint?: string;
}) => (
  <Card>
    <CardContent className="p-5">
      <p className="text-sm text-muted-foreground">{title}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </CardContent>
  </Card>
);

const Metricas = () => {
  const { activeRestaurantId } = useRestaurantAccess();
  const [periodDays, setPeriodDays] = useState(30);
  const { data, loading, error, reload } = useMetricsOverview(activeRestaurantId, periodDays);

  return (
    <DashboardLayout title="Métricas">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Visão geral do desempenho</h2>
            <p className="text-sm text-muted-foreground">
              Cardápio, mesas, pedidos e clientes nos últimos {periodDays} dias.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {PERIODS.map((period) => (
              <Button
                key={period.days}
                size="sm"
                variant={period.days === periodDays ? "default" : "outline"}
                onClick={() => setPeriodDays(period.days)}
              >
                {period.label}
              </Button>
            ))}
            <Button size="sm" variant="outline" onClick={() => void reload()} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {error ? (
          <Card>
            <CardContent className="p-5 text-sm text-destructive">{error}</CardContent>
          </Card>
        ) : null}

        {loading && !data ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[0, 1, 2, 3].map((index) => (
              <Skeleton key={index} className="h-28 w-full" />
            ))}
          </div>
        ) : null}

        {data ? (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                title="Total de vendas"
                value={formatarMoeda(data.totalSales)}
                hint={`${data.totalOrders} pedidos válidos`}
              />
              <MetricCard
                title="Ticket médio"
                value={formatarMoeda(data.averageTicket)}
                hint={`${data.canceledOrders} cancelados no período`}
              />
              <MetricCard
                title="Pedidos por mesa"
                value={data.ordersPerTableAverage.toFixed(1)}
                hint={`${data.tablesWithOrders} de ${data.totalTables} mesas com pedidos`}
              />
              <MetricCard
                title="Conversão de importados"
                value={`${data.importedConversionRate.toFixed(1)}%`}
                hint={`${data.convertedImportedCustomers} de ${data.importedCustomers} clientes importados compraram`}
              />
            </div>

            <Tabs defaultValue="pedidos">
              <TabsList>
                <TabsTrigger value="pedidos">
                  <ShoppingBasket className="mr-2 h-4 w-4" /> Pedidos
                </TabsTrigger>
                <TabsTrigger value="mesas">
                  <TableIcon className="mr-2 h-4 w-4" /> Mesas
                </TabsTrigger>
                <TabsTrigger value="cardapio">
                  <Store className="mr-2 h-4 w-4" /> Cardápio
                </TabsTrigger>
                <TabsTrigger value="clientes">
                  <Users className="mr-2 h-4 w-4" /> Clientes
                </TabsTrigger>
              </TabsList>

              <TabsContent value="pedidos" className="mt-4 space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <MetricCard title="Pedidos no período" value={String(data.totalOrders)} />
                  <MetricCard title="Pedidos em aberto" value={String(data.openOrders)} />
                  <MetricCard title="Cancelados" value={String(data.canceledOrders)} />
                </div>
                <Card>
                  <CardHeader>
                    <CardTitle>Pedidos por canal</CardTitle>
                    <CardDescription>Quantidade e faturamento por tipo de pedido.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {data.ordersByType.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Nenhum pedido no período.</p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Canal</TableHead>
                            <TableHead className="text-right">Pedidos</TableHead>
                            <TableHead className="text-right">Faturamento</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {data.ordersByType.map((row) => (
                            <TableRow key={row.type}>
                              <TableCell>{ORDER_TYPE_LABELS[row.type] ?? row.type}</TableCell>
                              <TableCell className="text-right">{row.orders}</TableCell>
                              <TableCell className="text-right">{formatarMoeda(row.revenue)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="mesas" className="mt-4 space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <MetricCard title="Mesas ativas" value={String(data.totalTables)} />
                  <MetricCard title="Mesas ocupadas agora" value={String(data.occupiedTables)} />
                  <MetricCard title="Faturamento em mesas" value={formatarMoeda(data.tableRevenue)} />
                </div>
                <Card>
                  <CardHeader>
                    <CardTitle>Pedidos por mesa</CardTitle>
                    <CardDescription>
                      {data.tableOrders} pedidos atendidos em mesas nos últimos {periodDays} dias.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {data.mesas.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Nenhuma mesa cadastrada.</p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Mesa</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Pedidos</TableHead>
                            <TableHead className="text-right">Faturamento</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {data.mesas.map((mesa) => (
                            <TableRow key={mesa.id}>
                              <TableCell className="font-medium">{mesa.label}</TableCell>
                              <TableCell>
                                <Badge variant="outline">
                                  {TABLE_STATUS_LABELS[mesa.status] ?? mesa.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">{mesa.orders}</TableCell>
                              <TableCell className="text-right">{formatarMoeda(mesa.revenue)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="cardapio" className="mt-4 space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <MetricCard title="Produtos cadastrados" value={String(data.totalProducts)} />
                  <MetricCard title="Produtos disponíveis" value={String(data.availableProducts)} />
                  <MetricCard title="Categorias" value={String(data.totalCategories)} />
                </div>
                <Card>
                  <CardHeader>
                    <CardTitle>Mais vendidos</CardTitle>
                    <CardDescription>Itens com maior saída no período.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {data.topProducts.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Sem vendas registradas no período.</p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Produto</TableHead>
                            <TableHead className="text-right">Qtd.</TableHead>
                            <TableHead className="text-right">Faturamento</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {data.topProducts.map((product) => (
                            <TableRow key={product.name}>
                              <TableCell className="font-medium">{product.name}</TableCell>
                              <TableCell className="text-right">{product.quantity}</TableCell>
                              <TableCell className="text-right">{formatarMoeda(product.revenue)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="clientes" className="mt-4 space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <MetricCard title="Clientes na base" value={String(data.totalCustomers)} />
                  <MetricCard title="Novos no período" value={String(data.newCustomersInPeriod)} />
                  <MetricCard title="Clientes importados" value={String(data.importedCustomers)} />
                </div>
                <Card>
                  <CardHeader>
                    <CardTitle>Conversão de clientes importados</CardTitle>
                    <CardDescription>
                      Percentual de clientes vindos de importação que já fizeram pelo menos um pedido.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-end justify-between">
                      <span className="text-3xl font-bold">
                        {data.importedConversionRate.toFixed(1)}%
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {data.convertedImportedCustomers}/{data.importedCustomers} clientes
                      </span>
                    </div>
                    <Progress value={Math.min(100, data.importedConversionRate)} />
                    {data.importedCustomers === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        Nenhum cliente importado identificado. Use a importação por CSV na página de
                        Clientes para acompanhar essa taxa.
                      </p>
                    ) : null}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        ) : null}
      </div>
    </DashboardLayout>
  );
};

export default Metricas;
