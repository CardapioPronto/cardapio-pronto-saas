
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface FiltroProdutosProps {
  categoriaAtiva: string;
  setCategoriaAtiva: (categoria: string) => void;
  busca: string;
  setBusca: (busca: string) => void;
  tipoPedido: "mesa" | "balcao";
  mesaSelecionada: string;
  setMesaSelecionada: (mesa: string) => void;
}

export const FiltroProdutos = ({
  categoriaAtiva,
  setCategoriaAtiva,
  busca,
  setBusca,
  tipoPedido,
  mesaSelecionada,
  setMesaSelecionada,
}: FiltroProdutosProps) => {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        {tipoPedido === "mesa" && (
          <div className="flex items-center gap-2">
            <label htmlFor="mesa" className="text-sm font-medium">Mesa:</label>
            <Input 
              id="mesa" 
              type="number" 
              value={mesaSelecionada} 
              onChange={(e) => setMesaSelecionada(e.target.value)} 
              className="w-16"
            />
          </div>
        )}
        <Input 
          placeholder="Buscar produto..." 
          className="max-w-xs"
          value={busca}
          onChange={(e) => setBusca(e.target.value)} 
        />
      </div>

      <Tabs defaultValue="lanches" value={categoriaAtiva} onValueChange={setCategoriaAtiva}>
        <TabsList className="grid grid-cols-5">
          <TabsTrigger value="lanches">Lanches</TabsTrigger>
          <TabsTrigger value="porcoes">Porções</TabsTrigger>
          <TabsTrigger value="bebidas">Bebidas</TabsTrigger>
          <TabsTrigger value="sobremesas">Sobremesas</TabsTrigger>
          <TabsTrigger value="outros">Outros</TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
};
