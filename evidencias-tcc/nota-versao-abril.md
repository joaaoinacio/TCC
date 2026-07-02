# Nota — Teste de Confirmação da Versão Pré-Refatoração (27/04/2026)

## Contexto

Durante a análise das evidências do TCC, foi identificada uma divergência entre os
resultados documentados no trabalho (ChatGPT SalesService: **10 passaram / 3 falharam**)
e os resultados obtidos ao rodar a suíte contra o código commitado no GitHub
(ChatGPT SalesService: **7 passaram / 6 falharam**).

A causa raiz foi localizada via **VS Code Local History**, que preservou um snapshot
de `src/sales/sales.service.ts` datado de **27/04/2026 às 23:17:26 (BRT)** — anterior
ao commit único publicado no GitHub em **22/06/2026 às 18:26:35 (BRT)**.

## A Diferença entre as Versões

| Aspecto | Versão de abril/26 (pré-refatoração) | Versão commitada (jun/26) |
|---|---|---|
| Lock pessimista em `create()` | `lock: { mode: 'pessimistic_write' }` no `findOne()` | `manager.query('SELECT ... FOR UPDATE')` |
| Lock pessimista em `cancel()` | `findOneOrFail()` com `lock: { mode: 'pessimistic_write' }` | `manager.query('SELECT ... FOR UPDATE')` |
| Usa `manager.query()` | **Não** | **Sim** |

A refatoração foi necessária porque o PostgreSQL rejeita `FOR UPDATE` combinado com
`LEFT JOIN` (gerado internamente pelo TypeORM quando há relações). A solução adotada
foi executar dois `SELECT ... FOR UPDATE` separados via SQL bruto antes de cada
operação transacional.

## O Problema com o Mock do ChatGPT

O mock do `EntityManager` gerado pelo ChatGPT não incluía o método `query()`.
Com a versão de abril, esse método nunca era chamado — logo os mocks funcionavam.
Com a versão commitada, os testes que acionam os caminhos de criação/cancelamento
falham imediatamente com `manager.query is not a function`.

## Confirmação Experimental

Em **01/07/2026**, foi criada a branch temporária `teste-versao-abril` com o conteúdo
do snapshot aplicado ao arquivo `src/sales/sales.service.ts`. A suíte foi executada
e o resultado confirmou os números originais do TCC:

```
Tests:  3 failed, 10 passed, 13 total
```

Os 3 testes que continuaram falhando com a versão original são falhas do próprio mock
do ChatGPT (não relacionadas ao lock):

| Teste que falhou | Causa |
|---|---|
| `create > deve lançar NotFoundException quando evento não existir` | Mock retorna `undefined` para `findOne(Ticket, ...)`, mas o teste esperava que o ticket existisse e o evento não — o mock não distinguia as duas chamadas ao `findOne` |
| `create > deve falhar para quantidade inválida` | A versão de abril não valida `quantity === 0` — a validação ocorre na camada DTO/Controller, não no Service |
| `cancel > deve lançar BadRequestException quando venda já estiver cancelada` | Mock do `manager.findOne(Sale, ...)` retorna `undefined`, mas o teste esperava retornar uma venda já cancelada — problema de configuração do mock |

## Arquivos deste Conjunto de Evidências

| Arquivo | Descrição |
|---|---|
| `sales.service-snapshot-2026-04-27.ts` | Conteúdo exato do snapshot do Local History (versão pré-refatoração) |
| `logs/teste-versao-abril-sales-chatgpt.txt` | Output completo da execução da suíte com essa versão (10/3) |
| `logs/chatgpt-unit-sales-service.txt` | Output da execução com a versão commitada (7/6) — evidência oficial do TCC |
