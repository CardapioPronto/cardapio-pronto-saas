import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { PackageSearch } from "lucide-react";

interface TabelaProdutosPeriodoProps {
  data: Array<{
    nome: string;
    quantidade: number;
    pedidos: number;
    receita: number;
  }>;
}

export const TabelaProdutosPeriodo = ({ data }: TabelaProdutosPeriodoProps) => {
  if (data.length === 0) {
    return (
      <EmptyState
        icon={PackageSearch}
        title="Nenhum produto no período"
        description="Ajuste o período ou os filtros para analisar os itens vendidos."
        compact
      />
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Produto</TableHead>
            <TableHead className="text-right">Qtd.</TableHead>
            <TableHead className="text-right">Pedidos</TableHead>
            <TableHead className="text-right">Receita</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((produto, index) => (
            <TableRow key={index}>
              <TableCell className="font-medium">{produto.nome}</TableCell>
              <TableCell className="text-right">{produto.quantidade}</TableCell>
              <TableCell className="text-right">{produto.pedidos}</TableCell>
              <TableCell className="text-right">
                {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL'
                }).format(produto.receita)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
