
import { useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QrCode, Download, Copy } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const MenuDigital = () => {
  const [qrCodeUrl, setQrCodeUrl] = useState("https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=https://cardapiopronto.com/menu/123");

  const copiarLink = () => {
    navigator.clipboard.writeText("https://cardapiopronto.com/menu/123");
    toast.success("Link copiado para a área de transferência");
  };

  const baixarQRCode = () => {
    const link = document.createElement('a');
    link.href = qrCodeUrl;
    link.download = 'qrcode-cardapio.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("QR Code baixado com sucesso");
  };

  return (
    <DashboardLayout title="Cardápio Digital">
      <div className="grid md:grid-cols-3 gap-6">
        {/* Coluna da esquerda - QR Code e opções */}
        <div className="md:col-span-1">
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <QrCode className="h-5 w-5 mr-2" />
                QR Code do Cardápio
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
              <div className="bg-white p-4 rounded-md shadow-sm mb-4">
                <img 
                  src={qrCodeUrl} 
                  alt="QR Code do Cardápio Digital" 
                  className="w-48 h-48"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3 w-full">
                <Button onClick={baixarQRCode} variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Baixar
                </Button>
                <Button onClick={copiarLink}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copiar Link
                </Button>
              </div>
              
              <div className="mt-4 text-sm text-center text-muted-foreground">
                <p>Imprima e coloque nas mesas</p>
                <p>Compartilhe nas redes sociais</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Personalização</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Cores do tema</label>
                <div className="flex gap-2">
                  <div className="w-8 h-8 rounded-full bg-green cursor-pointer border-2 border-gray-300"></div>
                  <div className="w-8 h-8 rounded-full bg-orange cursor-pointer"></div>
                  <div className="w-8 h-8 rounded-full bg-navy cursor-pointer"></div>
                  <div className="w-8 h-8 rounded-full bg-beige cursor-pointer"></div>
                  <div className="w-8 h-8 rounded-full bg-offwhite cursor-pointer"></div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Logo</label>
                <Button variant="outline" size="sm" className="w-full">Alterar Logo</Button>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Imagem de fundo</label>
                <Button variant="outline" size="sm" className="w-full">Selecionar imagem</Button>
              </div>
              
              <Button className="w-full bg-green hover:bg-green-dark text-white mt-2">
                Salvar alterações
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Coluna da direita - Visualização do cardápio */}
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Visualização do Cardápio</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border rounded-md p-4 bg-offwhite">
                <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200">
                  {/* Header do cardápio */}
                  <div className="bg-green p-4 text-center">
                    <h3 className="text-white text-xl font-bold">CardápioPronto</h3>
                    <p className="text-white/80 text-sm">Seu estabelecimento</p>
                  </div>

                  {/* Navegação por categorias */}
                  <Tabs defaultValue="lanches">
                    <div className="px-4 pt-4">
                      <TabsList className="grid grid-cols-4 w-full">
                        <TabsTrigger value="lanches">Lanches</TabsTrigger>
                        <TabsTrigger value="porcoes">Porções</TabsTrigger>
                        <TabsTrigger value="bebidas">Bebidas</TabsTrigger>
                        <TabsTrigger value="sobremesas">Sobremesas</TabsTrigger>
                      </TabsList>
                    </div>
                    
                    <div className="p-4">
                      <TabsContent value="lanches" className="space-y-4 mt-0">
                        {[
                          {nome: "X-Burger", descricao: "Hambúrguer, queijo, alface e tomate", preco: 18.90},
                          {nome: "X-Salada", descricao: "Hambúrguer, queijo, alface, tomate e maionese", preco: 21.90},
                          {nome: "X-Tudo", descricao: "Hambúrguer, queijo, bacon, ovo, alface, tomate e maionese", preco: 24.90}
                        ].map((item, index) => (
                          <div key={index} className="flex justify-between border-b pb-3">
                            <div>
                              <h4 className="font-medium">{item.nome}</h4>
                              <p className="text-sm text-gray-500">{item.descricao}</p>
                            </div>
                            <span className="font-bold text-green">R$ {item.preco.toFixed(2)}</span>
                          </div>
                        ))}
                      </TabsContent>

                      <TabsContent value="porcoes" className="space-y-4 mt-0">
                        {[
                          {nome: "Batata Frita", descricao: "Porção grande, serve 2 pessoas", preco: 12.90},
                          {nome: "Anéis de Cebola", descricao: "Empanados e crocantes", preco: 15.90}
                        ].map((item, index) => (
                          <div key={index} className="flex justify-between border-b pb-3">
                            <div>
                              <h4 className="font-medium">{item.nome}</h4>
                              <p className="text-sm text-gray-500">{item.descricao}</p>
                            </div>
                            <span className="font-bold text-green">R$ {item.preco.toFixed(2)}</span>
                          </div>
                        ))}
                      </TabsContent>

                      <TabsContent value="bebidas" className="mt-0">
                        {/* Conteúdo de bebidas vai aqui */}
                        <div className="text-center text-gray-500 py-4">
                          Selecione produtos na aba "Produtos"
                        </div>
                      </TabsContent>
                      
                      <TabsContent value="sobremesas" className="mt-0">
                        {/* Conteúdo de sobremesas vai aqui */}
                        <div className="text-center text-gray-500 py-4">
                          Selecione produtos na aba "Produtos"
                        </div>
                      </TabsContent>
                    </div>
                  </Tabs>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default MenuDigital;
