
import { Produto } from "../types";
import { ProdutoCard } from "./ProdutoCard";

interface ListaProdutosProps {
  categoriaAtiva: string;
  produtosFiltrados: Produto[];
  onSelecionarProduto: (produto: Produto) => void;
}

export const ListaProdutos = ({ 
  categoriaAtiva, 
  produtosFiltrados, 
  onSelecionarProduto 
}: ListaProdutosProps) => {
  return (
    <div className="mt-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
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
