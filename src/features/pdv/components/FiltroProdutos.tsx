
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCategorias } from "@/hooks/useCategorias";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface FiltroProdutosProps {
  categoriaAtiva: string;
  setCategoriaAtiva: (categoria: string) => void;
  busca: string;
  setBusca: (busca: string) => void;
  tipoPedido: "mesa" | "balcao";
  mesaSelecionada: string;
  setMesaSelecionada: (mesa: string) => void;
  restaurantId: string;
}

export const FiltroProdutos = ({
  categoriaAtiva,
  setCategoriaAtiva,
  busca,
  setBusca,
  tipoPedido,
  mesaSelecionada,
  setMesaSelecionada,
  restaurantId
}: FiltroProdutosProps) => {
  // Obter categorias do sistema
  const { categorias, loading } = useCategorias(restaurantId);
  
  // Gerar números de mesa de 1 a 20
  const mesas = Array.from({ length: 20 }, (_, i) => (i + 1).toString());

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-grow">
          <Input
            placeholder="Buscar produto..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full"
          />
        </div>
        
        {tipoPedido === "mesa" && (
          <div>
            <Select value={mesaSelecionada} onValueChange={setMesaSelecionada}>
              <SelectTrigger className="w-24">
                <SelectValue placeholder="Mesa" />
              </SelectTrigger>
              <SelectContent>
                {mesas.map((mesa) => (
                  <SelectItem key={mesa} value={mesa}>
                    Mesa {mesa}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
      
      {!loading && categorias.length > 0 && (
        <div className="overflow-x-auto pb-2">
          <Tabs value={categoriaAtiva} onValueChange={setCategoriaAtiva}>
            <TabsList className="h-auto flex flex-nowrap overflow-x-auto">
              <TabsTrigger value="" className="px-3 py-1.5">
                Todos
              </TabsTrigger>
              {categorias.map((categoria) => (
                <TabsTrigger
                  key={categoria.id}
                  value={categoria.id}
                  className="px-3 py-1.5 whitespace-nowrap"
                >
                  {categoria.name}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      )}
    </div>
  );
};
