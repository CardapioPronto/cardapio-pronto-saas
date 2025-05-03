
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingCart, Users, TrendingUp, DollarSign } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const Dashboard = () => {
  

const [stats, setStats] = useState<any[]>([]);
const [restaurantId, setRestaurantId] = useState<string | null>(null);

useEffect(() => {
  const getRestaurant = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("users")
      .select("restaurant_id")
      .eq("id", user?.id)
      .single();

    if (data?.restaurant_id) {
      setRestaurantId(data.restaurant_id);
    }
  };

  getRestaurant();
}, []);

useEffect(() => {
  if (!restaurantId) return;

  const fetchStats = async () => {
    const today = new Date();
    const startOfToday = new Date(today.setHours(0, 0, 0, 0)).toISOString();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
    const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1).toISOString();
    const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0).toISOString();

    const { data: salesToday } = await supabase
      .from("orders")
      .select("total")
      .eq("restaurant_id", restaurantId)
      .gte("created_at", startOfToday);

    const totalToday = salesToday?.reduce((sum, o) => sum + (o.total || 0), 0) || 0;

    const { data: ordersThisMonth } = await supabase
      .from("orders")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .gte("created_at", startOfMonth);

    const { data: ordersLastMonth } = await supabase
      .from("orders")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .gte("created_at", startOfLastMonth)
      .lte("created_at", endOfLastMonth);

    const pedidosAtual = ordersThisMonth?.length || 0;
    const pedidosAnterior = ordersLastMonth?.length || 0;
    const pedidosChange = calcularPercentual(pedidosAnterior, pedidosAtual);

    // Add null check for customer_name which might be undefined
    const clientesUnicos = new Set(ordersThisMonth?.filter(o => o.customer_name).map(o => o.customer_name)).size;
    const clientesAnteriores = new Set(ordersLastMonth?.filter(o => o.customer_name).map(o => o.customer_name)).size;
    const clientesChange = calcularPercentual(clientesAnteriores, clientesUnicos);

    const faturamentoAtual = ordersThisMonth?.reduce((sum, o) => sum + (o.total || 0), 0) || 0;
    const faturamentoAnterior = ordersLastMonth?.reduce((sum, o) => sum + (o.total || 0), 0) || 0;
    const faturamentoChange = calcularPercentual(faturamentoAnterior, faturamentoAtual);

    setStats([
      {
        title: "Vendas hoje",
        value: formatarMoeda(totalToday),
        change: "+0%",
        icon: DollarSign,
        color: "bg-green/10 text-green",
      },
      {
        title: "Pedidos",
        value: pedidosAtual.toString(),
        change: pedidosChange,
        icon: ShoppingCart,
        color: "bg-orange/10 text-orange",
      },
      {
        title: "Clientes",
        value: clientesUnicos.toString(),
        change: clientesChange,
        icon: Users,
        color: "bg-navy/10 text-navy",
      },
      {
        title: "Faturamento mensal",
        value: formatarMoeda(faturamentoAtual),
        change: faturamentoChange,
        icon: TrendingUp,
        color: "bg-beige/30 text-navy",
      },
    ]);
  };

  fetchStats();
}, [restaurantId]);

const calcularPercentual = (anterior: number, atual: number) => {
  if (anterior === 0 && atual > 0) return "+100%";
  if (anterior === 0 && atual === 0) return "0%";
  const diff = ((atual - anterior) / anterior) * 100;
  const prefix = diff > 0 ? "+" : "";
  return `${prefix}${diff.toFixed(0)}%`;
};

const formatarMoeda = (valor: number) =>
  valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  
  return (
    <DashboardLayout title="Dashboard">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{stat.title}</p>
                <h3 className="text-2xl font-bold mt-1">{stat.value || 0}</h3>
                <p className="text-xs text-green mt-1">{stat.change || 0} este mês</p>
              </div>
              <div className={`p-3 rounded-full ${stat.color}`}>
                <stat.icon className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 mt-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Vendas recentes</CardTitle>
            <CardDescription>Últimos pedidos realizados no sistema</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex justify-between items-center border-b pb-3">
                  <div>
                    <p className="font-medium">Mesa {i} - Comanda #{1000 + i}</p>
                    <p className="text-sm text-muted-foreground">{new Date().toLocaleTimeString()}</p>
                  </div>
                  <span className="font-medium">R$ {(Math.random() * 100 + 50).toFixed(2)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Produtos mais vendidos</CardTitle>
            <CardDescription>Items mais populares do seu cardápio</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {["X-Tudo", "Porção de batatas", "Cerveja", "Refrigerante"].map((item, i) => (
                <div key={i} className="flex justify-between items-center border-b pb-3">
                  <div>
                    <p className="font-medium">{item}</p>
                    <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1.5">
                      <div className="bg-green h-1.5 rounded-full" style={{ width: `${90 - i * 15}%` }}></div>
                    </div>
                  </div>
                  <span className="font-medium">{90 - i * 15} un</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
