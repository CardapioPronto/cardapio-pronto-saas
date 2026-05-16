import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Package } from "lucide-react";
import { toast } from "@/components/ui/sonner-toast";
import { useStockSettings } from "@/hooks/useStockSettings";

interface StockSettingsCardProps {
    restaurantId: string;
}

export const StockSettingsCard = ({ restaurantId }: StockSettingsCardProps) => {
    const { enabled, loading, saving, save } = useStockSettings(restaurantId);

    const handleToggle = async (next: boolean) => {
        try {
            await save(next);
            toast.success(
                next
                    ? "Controle de estoque ativado para este restaurante."
                    : "Controle de estoque desativado.",
            );
        } catch {
            toast.error("Não foi possível salvar a configuração de estoque.");
        }
    };

    if (loading) {
        return (
            <Card>
                <CardContent className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Controle de estoque
                </CardTitle>
                <CardDescription>
                    Quando ativado, você pode escolher quais produtos têm o saldo controlado. Vendas pelo cardápio,
                    pelo PDV e cancelamentos atualizam o saldo automaticamente.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-start justify-between gap-4 rounded-lg border border-border p-4">
                    <div className="space-y-1">
                        <Label htmlFor="stock-control-toggle" className="text-sm font-medium">
                            Usar controle de estoque
                        </Label>
                        <p className="text-xs text-muted-foreground">
                            Habilita a seção “Estoque” no cadastro de produto e os relatórios de movimentação.
                        </p>
                    </div>
                    <Switch
                        id="stock-control-toggle"
                        checked={enabled}
                        onCheckedChange={(value) => void handleToggle(value)}
                        disabled={saving}
                    />
                </div>

                {!enabled && (
                    <Alert className="bg-amber-50 border-amber-200">
                        <AlertDescription className="text-sm text-amber-900">
                            Com o controle desativado, a seção “Estoque” fica oculta nos cadastros de produto. Produtos
                            já configurados como rastreados continuam sendo abatidos a cada venda — para pausar de fato,
                            desligue também o controle nos produtos.
                        </AlertDescription>
                    </Alert>
                )}
            </CardContent>
        </Card>
    );
};
