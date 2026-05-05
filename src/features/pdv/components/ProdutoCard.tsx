
import { memo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Product } from "@/types";
import produtoPadrao from "@/assets/produto-padrao.jpg";
import { PlusCircle } from "lucide-react";

interface ProdutoCardProps {
  produto: Product;
  onSelecionar: (produto: Product) => void;
}

const ProdutoCardBase = ({ produto, onSelecionar }: ProdutoCardProps) => {
  const imageSrc = produto.image_url || produtoPadrao;

  return (
    <Card key={produto.id} className="group h-full overflow-hidden transition hover:border-primary/40 hover:shadow-sm">
      <button
        type="button"
        className="flex h-full w-full flex-col text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        onClick={() => onSelecionar(produto)}
      >
        <CardContent className="flex h-full flex-col p-3">
          <div className="relative mb-3 h-24 w-full overflow-hidden rounded-md bg-muted">
            <img
              src={imageSrc}
              alt={produto.name}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover transition group-hover:scale-[1.03]"
            />
            <span className="absolute right-2 top-2 rounded-full bg-background/95 p-1 text-primary shadow-sm">
              <PlusCircle className="h-4 w-4" />
            </span>
          </div>
          <div className="line-clamp-2 min-h-10 font-medium leading-tight">{produto.name}</div>
          <div className="mt-1 line-clamp-2 text-sm text-muted-foreground">
            {produto.description || "Sem descrição"}
          </div>
          <div className="mt-auto pt-3 text-base font-bold text-emerald-700">
            R$ {produto.price.toFixed(2)}
          </div>
          {!produto.available && (
            <div className="mt-2 inline-flex w-fit rounded-full bg-orange-100 px-2 py-0.5 text-xs text-orange-700">
              Indisponível
            </div>
          )}
        </CardContent>
      </button>
    </Card>
  );
};

export const ProdutoCard = memo(ProdutoCardBase);
