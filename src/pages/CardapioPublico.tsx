
import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { QrCode } from "lucide-react";

interface Produto {
  id: number;
  nome: string;
  descricao: string;
  preco: number;
  categoria: string;
  disponivel: boolean;
  imagem?: string;
}

const CardapioPublico = () => {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [estabelecimento, setEstabelecimento] = useState({
    nome: "Restaurante Demo",
    logo: "/placeholder.svg",
    corPrimaria: "#81B29A",
    corSecundaria: "#E07A5F"
  });
  const [categoriaAtiva, setCategoriaAtiva] = useState("lanches");
  const [categorias, setCategorias] = useState<string[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    // Simulando carregamento dos dados
    const carregarDados = async () => {
      try {
        setCarregando(true);
        // Aqui seria uma chamada à API real
        const dadosSimulados: Produto[] = [
          { id: 1, nome: "X-Burger", descricao: "Hambúrguer, queijo, alface e tomate", preco: 18.90, categoria: "lanches", disponivel: true },
          { id: 2, nome: "X-Salada", descricao: "Hambúrguer, queijo, alface, tomate e maionese", preco: 21.90, categoria: "lanches", disponivel: true },
          { id: 3, nome: "X-Tudo", descricao: "Hambúrguer, queijo, bacon, ovo, alface, tomate e maionese", preco: 24.90, categoria: "lanches", disponivel: true },
          { id: 4, nome: "Batata Frita", descricao: "Porção grande, serve 2 pessoas", preco: 12.90, categoria: "porcoes", disponivel: true },
          { id: 5, nome: "Anéis de Cebola", descricao: "Empanados e crocantes", preco: 15.90, categoria: "porcoes", disponivel: true },
          { id: 6, nome: "Água Mineral", descricao: "500ml", preco: 3.50, categoria: "bebidas", disponivel: true },
          { id: 7, nome: "Refrigerante Lata", descricao: "350ml", preco: 5.00, categoria: "bebidas", disponivel: true },
          { id: 8, nome: "Cerveja Long Neck", descricao: "355ml", preco: 7.50, categoria: "bebidas", disponivel: true },
          { id: 9, nome: "Pudim", descricao: "Tradicional com calda de caramelo", preco: 8.90, categoria: "sobremesas", disponivel: true },
          { id: 10, nome: "Sorvete", descricao: "2 bolas com calda", preco: 10.90, categoria: "sobremesas", disponivel: true },
        ];
        
        setProdutos(dadosSimulados.filter(p => p.disponivel));
        
        // Extrai categorias únicas
        const categoriasUnicas = Array.from(new Set(dadosSimulados.map(p => p.categoria)));
        setCategorias(categoriasUnicas);
        
        // Seleciona primeira categoria como padrão
        if (categoriasUnicas.length > 0) {
          setCategoriaAtiva(categoriasUnicas[0]);
        }
        
        setCarregando(false);
      } catch (error) {
        console.error("Erro ao carregar produtos:", error);
        setErro("Não foi possível carregar o cardápio. Tente novamente mais tarde.");
        setCarregando(false);
      }
    };

    carregarDados();
  }, []);
  
  // Filtrar produtos pela categoria ativa
  const produtosFiltrados = produtos.filter(p => p.categoria === categoriaAtiva);

  // Converter nome da categoria para formato mais amigável
  const formatarCategoria = (categoria: string) => {
    const mapeamento: Record<string, string> = {
      'lanches': 'Lanches',
      'porcoes': 'Porções',
      'bebidas': 'Bebidas',
      'sobremesas': 'Sobremesas',
      'entradas': 'Entradas',
      'petiscos': 'Petiscos'
    };
    
    return mapeamento[categoria] || categoria.charAt(0).toUpperCase() + categoria.slice(1);
  };
  
  if (carregando) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-beige/10 p-4">
        <div className="animate-pulse bg-white rounded-lg shadow-md w-full max-w-md p-6">
          <div className="w-full h-12 bg-gray-300 rounded mb-6"></div>
          <div className="space-y-4">
            <div className="h-8 bg-gray-300 rounded"></div>
            <div className="h-24 bg-gray-300 rounded"></div>
            <div className="h-24 bg-gray-300 rounded"></div>
          </div>
        </div>
      </div>
    );
  }
  
  if (erro) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-beige/10 p-4">
        <div className="bg-white rounded-lg shadow-md w-full max-w-md p-6 text-center">
          <h1 className="text-xl font-bold text-red-500 mb-2">Ops!</h1>
          <p className="text-gray-700 mb-4">{erro}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-beige/10">
      {/* Cabeçalho */}
      <div 
        className="p-4 text-center" 
        style={{ backgroundColor: estabelecimento.corPrimaria }}
      >
        <div className="container mx-auto max-w-lg">
          <div className="flex justify-center mb-2">
            <img 
              src={estabelecimento.logo} 
              alt={estabelecimento.nome} 
              className="h-12 object-contain" 
            />
          </div>
          <h1 className="text-xl font-bold text-white">{estabelecimento.nome}</h1>
          <p className="text-white/80 text-sm">Cardápio Digital</p>
        </div>
      </div>
      
      {/* Corpo do Cardápio */}
      <div className="container mx-auto max-w-lg p-4 pb-24">
        {/* Navegação por categorias */}
        <Tabs value={categoriaAtiva} onValueChange={setCategoriaAtiva}>
          <TabsList className="mb-4 w-full grid" style={{
            gridTemplateColumns: `repeat(${Math.min(categorias.length, 4)}, 1fr)`
          }}>
            {categorias.map(categoria => (
              <TabsTrigger key={categoria} value={categoria}>
                {formatarCategoria(categoria)}
              </TabsTrigger>
            ))}
          </TabsList>
          
          {categorias.map(categoria => (
            <TabsContent key={categoria} value={categoria} className="space-y-4">
              <h2 className="text-lg font-bold">{formatarCategoria(categoria)}</h2>
              
              {produtosFiltrados.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Nenhum produto disponível nesta categoria
                </div>
              ) : (
                <div className="space-y-3">
                  {produtosFiltrados.map(produto => (
                    <Card key={produto.id}>
                      <CardContent className="p-4">
                        <div className="flex justify-between">
                          <div>
                            <h3 className="font-bold">{produto.nome}</h3>
                            <p className="text-sm text-gray-600">{produto.descricao}</p>
                          </div>
                          <div className="font-bold text-green whitespace-nowrap ml-4">
                            R$ {produto.preco.toFixed(2)}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
      
      {/* Rodapé com informações */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-3 text-center">
        <div className="flex justify-center items-center text-sm text-gray-600">
          <QrCode className="h-4 w-4 mr-1" />
          <span>Cardápio Digital por <strong>CardápioPronto</strong></span>
        </div>
      </div>
    </div>
  );
};

export default CardapioPublico;
