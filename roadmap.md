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

## C01.2/C01.3 — Fechamento definitivo no servidor
- [x] Calcular e congelar o fechamento no servidor, sem totais do navegador; bloquear fechamento duplo.
- [ ] Validar com turno real e teste concorrente — bloqueado: Supabase externo sem sessão disponível.

## C01.4 — Permissão e auditoria do caixa
- [x] Permissão Gerenciar Caixa no banco, rota, menu e cadastro de funcionários; auditoria de forma de pagamento e fechamentos.
- [x] Consultar auditoria do caixa com período, ação, responsável, valores anteriores/novos e paginação — 20 testes unitários e 1 fluxo de tela simulado aprovados.
- [ ] Aprovação de exceções no fechamento — depende de definir a política de aprovação e os casos autorizáveis; não foi incluída na consulta somente leitura.
- [ ] Validar com colaborador sem permissão — bloqueado: Supabase externo sem sessão disponível.

## C02 — Livro de sangrias e suprimentos
- [x] Lançamentos individuais com motivo, comprovante, responsável e horário; fechamento usa o livro — 4 testes unitários.
- [ ] Foto do comprovante e validação em turno real — bloqueado: Supabase externo sem sessão disponível.

## C02 — Relatório de fechamento
- [x] Consultar relatório congelado com operadores, recebimentos, formas e divergências; exportar CSV e imprimir — 15 testes unitários e fluxo de navegador simulado aprovados.
- [ ] Aprovação de exceções — bloqueado: política de aprovação ainda não definida.
- [ ] Validar relatório em turno real e impressora física — bloqueado: Supabase externo sem sessão disponível e hardware da loja.
