# Fechamento de caixa e conciliacao da maquininha

Entrega do bloco M7 (2026-10-08). Estrategia escolhida: **conciliacao manual estruturada**
em vez de integracao direta com adquirente (Stone, Cielo, PagSeguro etc.), que fica para
quando o piloto pedir TEF/POS integrado.

## O que foi entregue

- Tabela `cash_register_sessions` com RLS por restaurante (`get_user_restaurant_id()`).
- Apenas um caixa aberto por restaurante (indice unico parcial).
- Caixa fechado nao pode ser alterado (politica de update so para `status = 'open'`) nem apagado.
- Trigger de validacao: status valido, valores nao negativos, `closed_at`/`closed_by` automaticos.
- Tela `/caixa` (menu **Caixa**, permissoes `pdv_access` ou `orders_manage`):
  - abertura com troco inicial;
  - vendas do sistema desde a abertura (pedidos nao cancelados);
  - declaracao de dinheiro contado, sangrias, PIX, credito, debito e voucher;
  - maquininha e lote/referencia do relatorio;
  - diferenca calculada em tempo real (Conferido / Sobra / Falta) e observacoes;
  - historico dos ultimos 15 fechamentos.
- Regra de calculo isolada em `src/lib/cashRegister.ts` com testes (`cashRegister.test.ts`, 4/4).

## Formula

```text
vendas declaradas = (dinheiro contado - troco inicial + sangrias) + PIX + credito + debito + voucher
diferenca         = vendas declaradas - vendas registradas no sistema
```

O total do sistema e recalculado no momento do fechamento para evitar valor desatualizado.

## Como testar no piloto

1. Acesse **Caixa** e abra com o troco (ex.: R$ 100,00).
2. Faca pedidos no PDV.
3. Volte em **Caixa**: confira **Vendas no sistema**.
4. Preencha dinheiro contado e os totais do relatorio da maquininha.
5. Verifique o selo de diferenca e feche o caixa.
6. Confirme o fechamento em **Ultimos fechamentos**.

## Limites conhecidos

- O PDV ainda nao grava forma de pagamento por pedido; a conciliacao e pelo total do turno.
- Sem integracao automatica com adquirente/TEF.
- Sem relatorio impresso do fechamento (pode ser exportado em versao futura).
