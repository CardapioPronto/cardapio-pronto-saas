# Roadmap da análise competitiva — 2026-10-21

- [x] Revisar funcionalidades existentes e distinguir lacunas de validações pendentes.
- [x] Comparar com ofertas públicas de sistemas semelhantes no Brasil.
- [x] Elaborar checklist priorizado com escopo, critérios de aceite e dependências, sem alterar funcionalidades do app.

## Execução — C01, primeira tarefa
- [x] Separar vendas do turno, recebimentos locais confirmados, pagamentos pendentes e valores de canais externos.
- [x] Conciliar por data de pagamento, incluindo pedidos antigos recebidos no turno, sem duplicidade.
- [x] Alinhar conferência por pedido e análise por IA às mesmas regras; testar e documentar evidências e limites.
- [ ] Validar turno autenticado e repasses reais — bloqueado: Supabase externo sem sessão disponível e sem evidência de transferência do provedor.

## Acompanhamento financeiro por restaurante
- [x] Criar página de consulta com período, fluxo registrado, recebimentos e pedidos sem exigir caixa aberto.
- [x] Integrar seleção de unidade, rota e menu com permissões existentes; testar cálculos e consulta simulada.
- [x] Documentar limites de sangrias, despesas e repasses em docs/FINANCEIRO_RESTAURANTE.md.
- [ ] Validar acompanhamento com conta real do gerente — bloqueado: Supabase externo sem sessão disponível.