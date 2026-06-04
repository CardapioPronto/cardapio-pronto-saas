import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { MesaSelectorModal } from "@/components/pdv/MesaSelectorModal";
import { AlertCircle, Search, XCircle, MapPin } from "lucide-react";
import { useState } from "react";
import { Mesa } from "@/types/mesa";
import { Area } from "@/types/area";
import { Category } from "@/types";

interface FiltroProdutosProps {
  categoriaAtiva: string;
  setCategoriaAtiva: (categoria: string) => void;
  busca: string;
  setBusca: (busca: string) => void;
  tipoPedido: "mesa" | "balcao";
  mesaSelecionada: string;
  setMesaSelecionada: (mesa: string) => void;
  mesaError?: string;
  mesas: Mesa[];
  mesasLoading?: boolean;
  onRefreshMesas?: () => Promise<void> | void;
  categorias: Category[];
  categoriasLoading?: boolean;
  areas: Area[];
}

export const FiltroProdutos = ({
  categoriaAtiva,
  setCategoriaAtiva,
  busca,
  setBusca,
  tipoPedido,
  mesaSelecionada,
  setMesaSelecionada,
  mesaError,
  mesas,
  mesasLoading = false,
  onRefreshMesas,
  categorias,
  categoriasLoading = false,
  areas,
}: FiltroProdutosProps) => {
  const [modalMesaOpen, setModalMesaOpen] = useState(false);

  const getMesaInfo = (mesaId: string) => {
    const mesa = mesas.find(m => m.id === mesaId);
    return mesa ? `Mesa ${mesa.number}` : "Selecionar mesa";
  };

  const abrirSeletorMesa = async () => {
    await onRefreshMesas?.();
    setModalMesaOpen(true);
  };

  const limparMesaSelecionada = () => {
    setMesaSelecionada("");
  };

  return (
    <div className="space-y-4">
      {/* Seletor de mesa via modal */}
      {tipoPedido === "mesa" && (
        <div className="space-y-2">
          <Label>Mesa para o pedido</Label>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={abrirSeletorMesa}
              className={`min-w-0 flex-1 justify-start ${mesaError ? "border-destructive text-destructive hover:text-destructive" : ""}`}
              aria-invalid={Boolean(mesaError)}
            >
              <MapPin className="mr-2 h-4 w-4 shrink-0" />
              <span className="truncate">
                {mesasLoading ? "Atualizando mesas..." : mesaSelecionada ? getMesaInfo(mesaSelecionada) : "Selecionar mesa"}
              </span>
            </Button>
            {mesaSelecionada && (
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={limparMesaSelecionada}
                aria-label="Remover mesa selecionada"
              >
                <XCircle className="h-4 w-4" />
              </Button>
            )}
          </div>
          {mesaError && (
            <p className="flex items-center gap-1.5 text-xs text-destructive">
              <AlertCircle className="h-3.5 w-3.5" />
              {mesaError}
            </p>
          )}
        </div>
      )}

      {tipoPedido === "balcao" && (
        <div className="rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground">
          Pedido de balcão sem mesa vinculada.
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
              {categoriasLoading ? (
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
        onClearMesa={limparMesaSelecionada}
        tipoPedido={tipoPedido}
      />
    </div>
  );
};
