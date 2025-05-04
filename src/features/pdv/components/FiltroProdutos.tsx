
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCategorias } from "@/hooks/useCategorias";
import { Search, XCircle } from "lucide-react";

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
  restaurantId,
}: FiltroProdutosProps) => {
  const { categorias, loading } = useCategorias(restaurantId);
  const numerosMesas = Array.from({ length: 20 }, (_, i) => `${i + 1}`);

  return (
    <div className="flex flex-col sm:flex-row gap-4">
      {/* Filtro de mesas (apenas se for pedido de mesa) */}
      {tipoPedido === "mesa" && (
        <div className="w-full sm:w-1/4">
          <Label htmlFor="mesa-select">Mesa</Label>
          <Select value={mesaSelecionada} onValueChange={setMesaSelecionada}>
            <SelectTrigger id="mesa-select">
              <SelectValue placeholder="Selecione a mesa" />
            </SelectTrigger>
            <SelectContent>
              {numerosMesas.map((numero) => (
                <SelectItem key={numero} value={numero}>
                  Mesa {numero}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Filtro de categorias */}
      <div className="w-full sm:w-1/3">
        <Label htmlFor="categoria-select">Categoria</Label>
        <Select value={categoriaAtiva} onValueChange={setCategoriaAtiva}>
          <SelectTrigger id="categoria-select">
            <SelectValue placeholder="Todas as categorias" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todas as categorias</SelectItem>
            {loading ? (
              <SelectItem value="loading" disabled>
                Carregando categorias...
              </SelectItem>
            ) : (
              categorias.map((categoria) => (
                <SelectItem key={categoria.id} value={categoria.id}>
                  {categoria.name}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>

      {/* Busca de produtos */}
      <div className="w-full sm:flex-1">
        <Label htmlFor="produto-busca">Buscar produto</Label>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            id="produto-busca"
            placeholder="Nome ou descrição do produto"
            className="pl-8"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
          {busca && (
            <button
              type="button"
              onClick={() => setBusca("")}
              className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
            >
              <XCircle className="h-4 w-4" />
              <span className="sr-only">Limpar busca</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
