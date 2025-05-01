
# CardápioPronto - Sistema de Gestão para Restaurantes

## Visão Geral

CardápioPronto é uma plataforma SaaS completa para gestão de restaurantes, incluindo cardápio digital, PDV, controle de pedidos e integração com serviços de delivery.

**URL do Projeto**: https://lovable.dev/projects/168abcc8-16cf-4537-856f-fe5725db5710

## Configuração do Ambiente Local

### Pré-requisitos

- Node.js (versão 16 ou superior)
- npm ou yarn
- Conta no Supabase

### Configuração das Variáveis de Ambiente

1. Crie um arquivo `.env` na raiz do projeto com o seguinte conteúdo:

```
VITE_SUPABASE_URL=sua_url_do_supabase
VITE_SUPABASE_ANON_KEY=sua_chave_anon_do_supabase
```

Substitua `sua_url_do_supabase` e `sua_chave_anon_do_supabase` pelos valores da sua conta do Supabase.

### Instalação

```bash
# Instalar dependências
npm install
# ou
yarn

# Iniciar servidor de desenvolvimento
npm run dev
# ou
yarn dev
```

O aplicativo estará disponível em `http://localhost:8080`.

### Estrutura do Banco de Dados

O sistema utiliza o Supabase como backend e requer as seguintes tabelas:

- `restaurants`: Estabelecimentos cadastrados
- `products`: Produtos do cardápio
- `orders`: Pedidos realizados
- `order_items`: Itens de cada pedido
- `menus`: Cardápios configurados
- `menu_categories`: Categorias dos cardápios
- `menu_items`: Itens dos cardápios
- `subscriptions`: Assinaturas dos estabelecimentos
- `restaurant_settings`: Configurações dos estabelecimentos
- `ifood_integration`: Configurações de integração com iFood

O esquema completo do banco de dados está disponível no arquivo `src/lib/supabase-schema.sql`.

### Como utilizar este projeto

Existem várias maneiras de editar e interagir com este aplicativo:

**Usando Lovable**

Visite o [Projeto no Lovable](https://lovable.dev/projects/168abcc8-16cf-4537-856f-fe5725db5710) e comece a interagir.
As alterações feitas via Lovable são automaticamente enviadas para este repositório.

**Usando sua IDE preferida**

Se preferir trabalhar localmente usando sua própria IDE, clone este repositório e envie as alterações. 
As alterações enviadas também serão refletidas no Lovable.

**Editando um arquivo diretamente no GitHub**

- Navegue até o(s) arquivo(s) desejado(s).
- Clique no botão "Editar" (ícone de lápis) no canto superior direito da visualização do arquivo.
- Faça suas alterações e confirme as alterações.

**Usando GitHub Codespaces**

- Navegue até a página principal do repositório.
- Clique no botão "Code" (botão verde) próximo ao canto superior direito.
- Selecione a guia "Codespaces".
- Clique em "New codespace" para iniciar um novo ambiente Codespace.
- Edite os arquivos diretamente no Codespace e confirme e envie suas alterações quando terminar.

## Tecnologias Utilizadas

Este projeto foi construído com:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
- Supabase (autenticação e banco de dados)

## Implantação

Para implantar este projeto, abra o [Lovable](https://lovable.dev/projects/168abcc8-16cf-4537-856f-fe5725db5710) e clique em Compartilhar -> Publicar.

## Conectando um domínio personalizado

Por padrão, seu aplicativo Lovable está acessível através de um subdomínio Lovable de preparação (por exemplo, seusite.lovable.app). No entanto, você pode conectar seu site a um domínio personalizado (por exemplo, seudominio.com) ou a um subdomínio (por exemplo, subdominio.seudominio.com) que você possui.

Para conectar um domínio personalizado, navegue até Projeto > Configurações > Domínios no Lovable.

Tenha em mente que um plano pago do Lovable é necessário para conectar um domínio personalizado.
