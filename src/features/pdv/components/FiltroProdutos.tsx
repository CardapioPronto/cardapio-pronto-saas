import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useCategorias } from "@/hooks/useCategorias";
import { useMesas } from "@/hooks/useMesas";
import { useAreas } from "@/hooks/useAreas";
import { MesaSelectorModal } from "@/components/pdv/MesaSelectorModal";
import { Search, XCircle, MapPin } from "lucide-react";
import { useState } from "react";

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
  const { categorias, loading } = useCategorias();
  const { mesas } = useMesas(restaurantId);
  const { areas } = useAreas(restaurantId);
  const [modalMesaOpen, setModalMesaOpen] = useState(false);

  const getMesaInfo = (mesaId: string) => {
    const mesa = mesas.find(m => m.id === mesaId);
    return mesa ? `Mesa ${mesa.number}` : "Selecionar mesa";
  };

  return (
    <div className="space-y-4">
      {/* Seletor de mesa via modal */}
      {tipoPedido === "mesa" && (
        <div className="space-y-2">
          <Label>Mesa para o pedido</Label>
          <Button
            variant="outline"
            onClick={() => setModalMesaOpen(true)}
            className="w-full justify-start"
          >
            <MapPin className="mr-2 h-4 w-4" />
            {mesaSelecionada ? getMesaInfo(mesaSelecionada) : "Selecionar mesa"}
          </Button>
        </div>
      )}

      {/* Seletor para balcão - opcional */}
      {tipoPedido === "balcao" && (
        <div className="space-y-2">
          <Label>Mesa para controle interno (opcional)</Label>
          <Button
            variant="outline"
            onClick={() => setModalMesaOpen(true)}
            className="w-full justify-start"
          >
            <MapPin className="mr-2 h-4 w-4" />
            {mesaSelecionada ? getMesaInfo(mesaSelecionada) : "Nenhuma mesa selecionada"}
          </Button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4">
        {/* Filtro de categorias */}
        <div className="w-full sm:w-1/3">
          <Label htmlFor="categoria-select">Categoria</Label>
          <Select value={categoriaAtiva} onValueChange={setCategoriaAtiva}>
            <SelectTrigger id="categoria-select">
              <SelectValue placeholder="Todas as categorias" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as categorias</SelectItem>
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

      {/* Modal de seleção de mesa */}
      <MesaSelectorModal
        open={modalMesaOpen}
        onOpenChange={setModalMesaOpen}
        mesas={mesas}
        areas={areas}
        mesaSelecionada={mesaSelecionada}
        onMesaChange={setMesaSelecionada}
        tipoPedido={tipoPedido}
      />
    </div>
  );
};