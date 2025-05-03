
import { useEffect, useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Plus, Search, Pencil, Trash2 } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Product } from "@/types";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { supabase } from "@/lib/supabase";
import { formatProductFromSupabase } from "@/utils/formatProductFromSupabase";

const Produtos = () => {
  // Tipo para produtos
  const [produtos, setProdutos] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useCurrentUser();
  const restaurantId = user?.restaurant_id ?? "";

  useEffect(() => {
    const fetchProdutos = async () => {
      setLoading(true);

      if (!restaurantId) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("products")
        .select(
          `
          id,
          name,
          description,
          price,
          available,          restaurant_id,
          category:categories!products_category_id_fkey (
            id,
            name,
            restaurant_id
          )
        `
        )
        .eq("restaurant_id", restaurantId);

      if (error) {
        console.error("Erro ao buscar produtos:", error);
      } else {
        setProdutos(formatProductFromSupabase(data));
      }

      setLoading(false);
    };

    fetchProdutos();
  }, [restaurantId]);

  const [novoProduto, setNovoProduto] = useState<Partial<Product>>({});
  const [produtoEditando, setProdutoEditando] = useState<Product | null>(null);
  const [filtro, setFiltro] = useState("");
  const [categoriaFiltrada, setCategoriaFiltrada] = useState<string | null>(
    null
  );

  // Adicionar novo produto
  const adicionarProduto = () => {
    if (!novoProduto.name || !novoProduto.description || (novoProduto.price ?? 0) <= 0) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    const id = Math.max(0, ...produtos.map((p) => Number(p.id))) + 1;
    // setProdutos([...produtos, { ...novoProduto, id } as Produto]);

    // setNovoProduto({
    //   name: "",
    //   description: "",
    //   price: 0,
    //   category: ,
    //   available: true,
    // });

    toast.success("Produto adicionado com sucesso!");
  };

  // Editar produto
  const iniciarEdicao = (produto: Product) => {
    setProdutoEditando({ ...produto });
  };

  const salvarEdicao = () => {
    if (!produtoEditando) return;

    setProdutos(
      produtos.map((p) => (p.id === produtoEditando.id ? produtoEditando : p))
    );

    setProdutoEditando(null);
    toast.success("Produto atualizado com sucesso!");
  };

  // Remover produto
  const removerProduto = (id: string) => {
    setProdutos(produtos.filter((p) => p.id !== id));
    toast.success("Produto removido com sucesso!");
  };

  // Filtragem de produtos
  const produtosFiltrados = produtos.filter((p) => {
    const matchesText =
      p.name.toLowerCase().includes(filtro.toLowerCase()) ||
      p.description.toLowerCase().includes(filtro.toLowerCase());
    const matchesCategoria = categoriaFiltrada
      ? p.category?.name === categoriaFiltrada
      : true;

    return matchesText && matchesCategoria;
  });

  return (
    <DashboardLayout title="Gerenciar Produtos">
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar produtos..."
              className="pl-8"
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
            />
          </div>

          <Select
            value={categoriaFiltrada || "all"}
            onValueChange={(value) =>
              setCategoriaFiltrada(value === "all" ? null : value)
            }
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

        <Dialog>
          <DialogTrigger asChild>
            <Button className="bg-green hover:bg-green-dark text-white">
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Produto
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar Novo Produto</DialogTitle>
              <DialogDescription>
                Preencha os campos para adicionar um novo produto ao cardápio
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="nome">Nome*</Label>
                <Input
                  id="nome"
                  value={novoProduto.name}
                  onChange={(e) =>
                    setNovoProduto({ ...novoProduto, name: e.target.value })
                  }
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="descricao">Descrição*</Label>
                <Input
                  id="descricao"
                  value={novoProduto.description}
                  onChange={(e) =>
                    setNovoProduto({
                      ...novoProduto,
                      description: e.target.value,
                    })
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="preco">Preço (R$)*</Label>
                  <Input
                    id="preco"
                    type="number"
                    step="0.01"
                    value={novoProduto.price}
                    onChange={(e) =>
                      setNovoProduto({
                        ...novoProduto,
                        price: parseFloat(e.target.value),
                      })
                    }
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="categoria">Categoria*</Label>
                  <Select
                    value={novoProduto.category?.name}
                    onValueChange={(value) =>
                      setNovoProduto({ 
                        ...novoProduto, 
                        category: { 
                          id: value,
                          name: value,
                          restaurant_id: restaurantId
                        } 
                      })
                    }
                  >
                    <SelectTrigger id="categoria">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lanches">Lanches</SelectItem>
                      <SelectItem value="porcoes">Porções</SelectItem>
                      <SelectItem value="bebidas">Bebidas</SelectItem>
                      <SelectItem value="sobremesas">Sobremesas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="disponivel"
                  checked={novoProduto.available}
                  onChange={(e) =>
                    setNovoProduto({
                      ...novoProduto,
                      available: e.target.checked,
                    })
                  }
                />
                <Label htmlFor="disponivel">Disponível para venda</Label>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setNovoProduto({
                    name: "",
                    description: "",
                    price: 0,
                    category: {
                      id: "lanches",
                      name: "lanches",
                      restaurant_id: restaurantId
                    },
                    available: true,
                  })
                }
              >
                Cancelar
              </Button>
              <Button type="button" onClick={adicionarProduto}>
                Adicionar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Produtos</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Preço</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {produtosFiltrados.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center py-8 text-muted-foreground"
                  >
                    Nenhum produto encontrado
                  </TableCell>
                </TableRow>
              ) : (
                produtosFiltrados.map((produto) => (
                  <TableRow key={produto.id}>
                    <TableCell className="font-medium">
                      {produto.name}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {produto.description}
                    </TableCell>
                    <TableCell>R$ {produto.price.toFixed(2)}</TableCell>
                    <TableCell className="capitalize">
                      {produto.category?.name}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-block px-2 py-1 rounded-full text-xs ${
                          produto.available
                            ? "bg-green/10 text-green"
                            : "bg-orange/10 text-orange"
                        }`}
                      >
                        {produto.available ? "Disponível" : "Indisponível"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => iniciarEdicao(produto)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Editar Produto</DialogTitle>
                            </DialogHeader>

                            {produtoEditando && (
                              <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                  <Label htmlFor="edit-nome">Nome*</Label>
                                  <Input
                                    id="edit-nome"
                                    value={produtoEditando.name}
                                    onChange={(e) =>
                                      setProdutoEditando({
                                        ...produtoEditando,
                                        name: e.target.value,
                                      })
                                    }
                                  />
                                </div>

                                <div className="grid gap-2">
                                  <Label htmlFor="edit-descricao">
                                    Descrição*
                                  </Label>
                                  <Input
                                    id="edit-descricao"
                                    value={produtoEditando.description}
                                    onChange={(e) =>
                                      setProdutoEditando({
                                        ...produtoEditando,
                                        description: e.target.value,
                                      })
                                    }
                                  />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                  <div className="grid gap-2">
                                    <Label htmlFor="edit-preco">
                                      Preço (R$)*
                                    </Label>
                                    <Input
                                      id="edit-preco"
                                      type="number"
                                      step="0.01"
                                      value={produtoEditando.price}
                                      onChange={(e) =>
                                        setProdutoEditando({
                                          ...produtoEditando,
                                          price: parseFloat(e.target.value),
                                        })
                                      }
                                    />
                                  </div>

                                  <div className="grid gap-2">
                                    <Label htmlFor="edit-categoria">
                                      Categoria*
                                    </Label>
                                    <Select
                                      value={produtoEditando.category?.name}
                                      onValueChange={(value) =>
                                        setProdutoEditando({
                                          ...produtoEditando,
                                          category: {
                                            id: value,
                                            name: value,
                                            restaurant_id: restaurantId
                                          },
                                        })
                                      }
                                    >
                                      <SelectTrigger id="edit-categoria">
                                        <SelectValue placeholder="Selecione" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="lanches">
                                          Lanches
                                        </SelectItem>
                                        <SelectItem value="porcoes">
                                          Porções
                                        </SelectItem>
                                        <SelectItem value="bebidas">
                                          Bebidas
                                        </SelectItem>
                                        <SelectItem value="sobremesas">
                                          Sobremesas
                                        </SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    id="edit-disponivel"
                                    checked={produtoEditando.available}
                                    onChange={(e) =>
                                      setProdutoEditando({
                                        ...produtoEditando,
                                        available: e.target.checked,
                                      })
                                    }
                                  />
                                  <Label htmlFor="edit-disponivel">
                                    Disponível para venda
                                  </Label>
                                </div>
                              </div>
                            )}

                            <DialogFooter>
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => setProdutoEditando(null)}
                              >
                                Cancelar
                              </Button>
                              <Button type="button" onClick={salvarEdicao}>
                                Salvar
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-500"
                          onClick={() => removerProduto(produto.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter className="flex justify-between">
          <div className="text-sm text-muted-foreground">
            Mostrando {produtosFiltrados.length} de {produtos.length} produtos
          </div>
        </CardFooter>
      </Card>
    </DashboardLayout>
  );
};

export default Produtos;
