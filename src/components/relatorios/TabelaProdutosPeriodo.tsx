import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface TabelaProdutosPeriodoProps {
  data: any[];
}

export const TabelaProdutosPeriodo = ({ data }: TabelaProdutosPeriodoProps) => {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Produto</TableHead>
            <TableHead className="text-right">Qtd</TableHead>
            <TableHead className="text-right">Receita</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((produto, index) => (
            <TableRow key={index}>
              <TableCell className="font-medium">{produto.nome}</TableCell>
              <TableCell className="text-right">{produto.quantidade}</TableCell>
              <TableCell className="text-right">
                {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL'
                }).format(produto.receita)}
              </TableCell>
            </TableRow>
          ))}
          {data.length === 0 && (
            <TableRow>
              <TableCell colSpan={3} className="text-center text-muted-foreground">
                Nenhum produto encontrado no período
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};