# Checklist de implantação — Pubfy

Roteiro do time de implantação para cada restaurante novo. Use uma cópia
desta página por cliente. Cada etapa tem **responsável**, **canal** e
**tempo estimado**.

> Restaurante demo de referência: use o cardápio criado por
> `public.seed_demo_restaurant('email')` (super admin) como modelo
> visual em call de demonstração.

---

## 0. Pré-vendas (responsável: comercial)

- [ ] Reunião de descoberta: tipo de operação (delivery, salão, ambos),
      número de mesas, fornecedor de iFood/Rappi, volume mensal estimado.
- [ ] Confirmar e-mail do dono + segundo contato (administrativo).
- [ ] Confirmar plano contratado (mensal vs anual).
- [ ] Confirmar canal de suporte preferencial (WhatsApp / Slack /
      e-mail).

---

## 1. Conta e assinatura (responsável: implantação)

Tempo: ≈ 30 min.

- [ ] Dono se cadastra em `https://app.pubfy.com.br/cadastro` e
      confirma o e-mail.
- [ ] Verificar que `restaurants` e `subscriptions` (trial) foram
      criados (Admin → Restaurantes).
- [ ] Caso o dono pague antes do fim do trial: configurar cartão na
      tela **Assinaturas → Planos** e confirmar alert "Plano ativo".
- [ ] Adicionar funcionários (caixa, cozinha) em **Equipe** com as
      permissões corretas:
  - Caixa/atendente → `orders_manage`, `pdv_use`.
  - Cozinha → `kitchen_view`.
  - Gerente → todas exceto `super_admin`.

---

## 2. Cardápio (responsável: implantação + dono)

Tempo: ≈ 2-3 horas. Pode ser feito em call ao vivo.

- [ ] Configurações → Estabelecimento: logo, banner, endereço,
      telefone WhatsApp, horário de funcionamento, categoria
      (`restaurante`, `bar`, `cafeteria`, …).
- [ ] Cardápio Digital → Personalização: tema (Default, Modern,
      Elegant, Delivery), cor primária, slug do cardápio público
      (`pubfy.com.br/<slug>`).
- [ ] Cardápio Digital → Categorias: criar pelo menos 3
      (ex.: Entradas, Pratos, Bebidas). Definir ordem.
- [ ] Cardápio Digital → Produtos: cadastrar com foto (máx 2 MB),
      descrição em 1-2 linhas, preço.
- [ ] (Opcional) Promoções iniciais e cupons de boas-vindas
      (`BEMVINDO10` é uma boa partida).

**Validação visual:** abrir o cardápio público em mobile (não no
preview do Lovable) com WiFi e 4G.

---

## 3. PDV e mesas (responsável: implantação)

Apenas se cliente opera salão. Tempo: ≈ 1 hora.

- [ ] Configurações → Mesas/Áreas: criar áreas (Salão, Varanda).
- [ ] Adicionar mesas (`Mesa 1`, `Mesa 2`, …). Capacidade real.
- [ ] PDV: testar lançar um pedido fictício de R$ 1, finalizar e
      cancelar para confirmar que mesa volta a `livre`.
- [ ] (Opcional) Gerar QR Code por mesa em **Cardápio → QR Code** e
      validar leitura pelo cliente.

---

## 4. Pagamento online (responsável: implantação)

Apenas se cliente quiser pagamento online. Tempo: ≈ 1 hora.

- [ ] Cliente assina contrato com Pagar.me / informa que já tem conta
      ativa.
- [ ] Cadastrar `pagarme_recipient_id` do cliente em **Admin
      → Pagar.me**.
- [ ] Configurar métodos de pagamento aceitos no plano (pix, cartão,
      boleto).
- [ ] Fazer 1 pedido real ≤ R$ 1, confirmar status `paid` e reembolsar
      em seguida.
- [ ] Validar que webhook chega: `pagarme_webhook_events` tem nova
      linha com `signature_valid = true`.

---

## 5. Delivery (responsável: implantação)

Apenas se cliente faz delivery próprio. Tempo: ≈ 1 hora.

- [ ] Configurações → Delivery: definir taxa de entrega (fixa ou por
      zona), distância máxima, pedido mínimo.
- [ ] Testar pedido de delivery com endereço dentro e fora da zona.

---

## 6. iFood / outros marketplaces (responsável: integrações)

Tempo: variável (≥ 1 dia, depende da aprovação no iFood).

- [ ] Cliente já tem conta iFood ativa.
- [ ] Cadastrar credenciais via Edge Function `ifood-integration`
      (não pela UI antiga). Use `docs/RUNBOOK_PRODUCAO.md` seção 1
      como referência.
- [ ] Confirmar que pedidos do iFood aparecem em **Pedidos** com
      `source = ifood`.

---

## 7. WhatsApp / IA (responsável: integrações)

Tempo: ≈ 2 horas.

- [ ] Cliente compra plano UltraMsg/Evolution e fornece QR code.
- [ ] Conectar instância em **Atendimento → Instâncias**.
- [ ] Configurar persona de IA em **Atendimento → Automação** (nome,
      tom, instruções, palavras-chave de hand-off humano).
- [ ] Testar: enviar pedido pelo cardápio público → cliente recebe
      mensagem automática no WhatsApp.

---

## 8. Treinamento (responsável: implantação + dono)

Tempo: 2 calls de 60 min.

- [ ] Call 1 — Dono: dashboard, assinatura, relatórios, marketing,
      configurações.
- [ ] Call 2 — Funcionários: PDV, fluxo de pedido, cozinha,
      atendimento WhatsApp.
- [ ] Entregar:
  - Link do cardápio público
  - `docs/QA_ROTEIROS_MANUAIS.md` (versão simplificada para
    cliente)
  - Contato de suporte

---

## 9. Go-live (responsável: implantação + suporte)

Tempo: 1 dia útil.

- [ ] Rodar `npm run preflight:prod` antes de liberar (suporte interno).
- [ ] Confirmar que `PUBLIC_SITE_URL` e Auth URLs apontam para o
      domínio definitivo (não preview).
- [ ] Acompanhar primeiras 48h via:
  - Supabase Edge Function logs (erros)
  - Pagar.me Dashboard (webhooks)
  - Resend Dashboard (bounce / complaint rate)
  - WhatsApp (mensagens não entregues)
- [ ] Registrar bugs encontrados no documento de suporte interno.

---

## 10. Pós go-live (responsável: customer success)

- [ ] Check-in em 24h, 7 dias e 30 dias.
- [ ] Coletar feedback estruturado (NPS).
- [ ] Identificar restaurantes-piloto que possam virar case.
