
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingCart, Users, TrendingUp, DollarSign } from "lucide-react";

const Dashboard = () => {
  const stats = [
    { title: "Vendas hoje", value: "R$ 1.250,00", change: "+12%", icon: DollarSign, color: "bg-green/10 text-green" },
    { title: "Pedidos", value: "45", change: "+4%", icon: ShoppingCart, color: "bg-orange/10 text-orange" },
    { title: "Clientes", value: "182", change: "+18%", icon: Users, color: "bg-navy/10 text-navy" },
    { title: "Faturamento mensal", value: "R$ 18.400,00", change: "+8%", icon: TrendingUp, color: "bg-beige/30 text-navy" }
  ];
  
  return (
    <DashboardLayout title="Dashboard">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{stat.title}</p>
                <h3 className="text-2xl font-bold mt-1">{stat.value}</h3>
                <p className="text-xs text-green mt-1">{stat.change} este mês</p>
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
