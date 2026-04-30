
import { Product } from "@/types";
import { ProdutoCard } from "./ProdutoCard";
import { Loader2, PackageSearch } from "lucide-react";

interface ListaProdutosProps {
  produtosFiltrados: Product[];
  onSelecionarProduto: (produto: Product) => void;
  loading?: boolean;
}

export const ListaProdutos = ({ 
  produtosFiltrados, 
  onSelecionarProduto,
  loading = false,
}: ListaProdutosProps) => {
  if (loading) {
    return (
      <div className="flex min-h-48 items-center justify-center rounded-md border border-dashed">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando produtos...
        </div>
      </div>
    );
  }

  if (produtosFiltrados.length === 0) {
    return (
      <div className="flex min-h-48 flex-col items-center justify-center rounded-md border border-dashed px-4 text-center">
        <PackageSearch className="mb-2 h-8 w-8 text-muted-foreground" />
        <p className="font-medium">Nenhum produto encontrado</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Ajuste a busca, a categoria ou verifique se existem produtos disponíveis.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {produtosFiltrados.map((produto) => (
          <ProdutoCard 
            key={produto.id} 
            produto={produto} 
            onSelecionar={onSelecionarProduto} 
          />
        ))}
      </div>
    </div>
  );
};
