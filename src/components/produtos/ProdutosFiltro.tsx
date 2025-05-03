
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ProdutosFiltroProps {
  filtro: string;
  categoriaFiltrada: string | null;
  onFiltroChange: (filtro: string) => void;
  onCategoriaChange: (categoria: string | null) => void;
}

export const ProdutosFiltro = ({
  filtro,
  categoriaFiltrada,
  onFiltroChange,
  onCategoriaChange,
}: ProdutosFiltroProps) => {
  return (
    <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
      <div className="relative w-full sm:w-64">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar produtos..."
          className="pl-8"
          value={filtro}
          onChange={(e) => onFiltroChange(e.target.value)}
        />
      </div>

      <Select
        value={categoriaFiltrada || "all"}
        onValueChange={(value) => onCategoriaChange(value === "all" ? null : value)}
      >
        <SelectTrigger className="w-full sm:w-40">
          <SelectValue placeholder="Categoria" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas</SelectItem>
          <SelectItem value="lanches">Lanches</SelectItem>
          <SelectItem value="porcoes">Porções</SelectItem>
          <SelectItem value="bebidas">Bebidas</SelectItem>
          <SelectItem value="sobremesas">Sobremesas</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};
