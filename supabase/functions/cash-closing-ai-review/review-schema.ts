const nullableNumber = { type: ["number", "null"] };

export const REVIEW_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["readable", "extracted", "divergences", "probable_causes", "summary", "risk_level"],
  properties: {
    readable: { type: "boolean" },
    extracted: {
      type: "object",
      additionalProperties: false,
      required: ["provider", "batch", "credit", "debit", "voucher", "pix", "total", "transactions_count"],
      properties: {
        provider: { type: ["string", "null"] },
        batch: { type: ["string", "null"] },
        credit: nullableNumber,
        debit: nullableNumber,
        voucher: nullableNumber,
        pix: nullableNumber,
        total: nullableNumber,
        transactions_count: { type: ["integer", "null"] },
      },
    },
    divergences: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["field", "declared", "found", "difference", "comment"],
        properties: {
          field: { type: "string" },
          declared: nullableNumber,
          found: nullableNumber,
          difference: nullableNumber,
          comment: { type: "string" },
        },
      },
    },
    probable_causes: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["cause", "likelihood", "how_to_check"],
        properties: {
          cause: { type: "string" },
          likelihood: { type: "string", enum: ["alta", "media", "baixa"] },
          how_to_check: { type: "string" },
        },
      },
    },
    summary: { type: "string" },
    risk_level: { type: "string", enum: ["ok", "atencao", "critico"] },
  },
};

export const INSTRUCTIONS = `Voce e um auditor de caixa de restaurante brasileiro.
Recebe: totais declarados pelo gerente no fechamento, resumo das vendas registradas no sistema durante o turno e a foto do relatorio da maquininha de cartao.
Tarefas:
1. Leia a foto e extraia credito, debito, voucher/refeicao, PIX (se houver), total, quantidade de transacoes, adquirente e lote. Use null quando nao estiver legivel. Nunca invente valores.
2. Compare foto x declarado x sistema e liste cada divergencia relevante (> R$ 0,50) com valores em reais.
3. Sugira causas provaveis ordenadas por probabilidade (ex.: venda cobrada na maquininha sem pedido no PDV, pedido cancelado apos cobranca, estorno, digitacao errada do gerente, troco/sangria nao registrada, PIX recebido fora da maquininha, gorjeta/taxa de servico, pedido delivery pago online contado no caixa), com como conferir.
4. Escreva um resumo curto em portugues do Brasil, objetivo, para o gerente.
Se a foto nao for um relatorio de maquininha ou estiver ilegivel, readable=false e explique no resumo.`;

