# Evidências de Execução — Apêndice B do TCC

## Resumo Geral

| Métrica | Total | ChatGPT | DeepSeek |
|---------|------:|--------:|---------:|
| Testes declarados | 255 | 88 | 167 |
| **Passaram** | **103** | **85** | **18** |
| **Falharam (runtime)** | **4** | **3** | **1** |
| **Não executados** _(erro de compilação TS)_ | **148** | **0** | **148** |

> Os números **88 (ChatGPT)** e **167 (DeepSeek)** batem com os declarados no TCC.  
> Os resultados de execução batem com a **Tabela 1 do TCC**: 85/88 ChatGPT e 18/167 DeepSeek.

---

## Nota Metodológica — Reprodução do Estado Histórico (abril/2026)

Duas suítes foram executadas contra o **estado histórico do código e dos testes de
abril/2026**, e não contra o estado do commit final (junho/2026). Essa decisão é
necessária porque o código evoluiu entre a coleta original e o momento em que o
repositório foi publicado no GitHub.

### Por que usar o estado histórico?

O único commit do repositório (`feat: initial commit`, 22/06/2026) consolidou o projeto
num estado posterior à coleta de dados do TCC. Nesse intervalo, duas mudanças
independentes alteraram os resultados das suítes:

**1. `chatgpt/unit/sales.service.spec.ts` — refatoração do lock pessimista**

O `SalesService` original (abril/2026) implementava o lock pessimista via TypeORM nativo
(`lock: { mode: 'pessimistic_write' }` dentro do `findOne()`). O mock do ChatGPT
ignorava a opção `lock` e retornava o valor pré-configurado normalmente — 10 testes
passavam, 3 falhavam por outros motivos de mock.

Antes do commit final, a implementação foi refatorada para SQL bruto
(`manager.query('SELECT ... FOR UPDATE')`) a fim de contornar uma limitação do PostgreSQL
com `FOR UPDATE + LEFT JOIN`. O mock do ChatGPT não incluía o método `query()`, fazendo
6 testes falharem com `TypeError: manager.query is not a function`.

A versão histórica do `SalesService` foi recuperada via **VS Code Local History**
(snapshot de 27/04/2026, `~/Library/Application Support/Code/User/History/2d79181b/Fco6.ts`).

**2. `deepseek/unit/users.service.spec.ts` — padrão double-call com mock esgotado**

A versão original do teste continha um padrão de double-call em um caso de erro:
```typescript
// chamada 1: consome os dois mockResolvedValueOnce → lança ConflictException ✓
await expect(service.update(id, dto)).rejects.toThrow(ConflictException);
// chamada 2: mock esgotado → findOne retorna undefined → lança NotFoundException ✗
await expect(service.update(id, dto)).rejects.toThrow('Email already in use');
```

O mock usava `mockResolvedValueOnce` duas vezes, ambas consumidas na primeira invocação
do serviço. A segunda chamada recebia `undefined` e lançava `NotFoundException` em vez
de `ConflictException`, causando 1 falha.

O padrão foi corrigido para single-promise antes do commit final (`const promise =
service.update(...); await expect(promise).rejects.toThrow(...)`), fazendo todos os
19 testes passarem na versão commitada.

A divergência foi confirmada por testes empíricos em branches temporárias em 01/07/2026:
restaurar o double-call reproduz exatamente 18/1; a versão commitada dá 19/0.

### Rastreabilidade dos snapshots

| Suíte | Snapshot utilizado | Fonte |
|---|---|---|
| `chatgpt/unit/sales.service.spec.ts` | `evidencias-tcc/sales.service-snapshot-2026-04-27.ts` | VS Code Local History, 27/04/2026 23:17 |
| `deepseek/unit/users.service.spec.ts` | Arquivo commitado + double-call restaurado | Diff do VS Code Local History (SiwO.ts, 27/04/2026 23:24) |

---

## Detalhamento por Suíte

| Modelo | Módulo | Nível | Total | Passou | Falhou | Não executado |
|--------|--------|-------|------:|-------:|-------:|--------------:|
| ChatGPT | UsersService | unitario | 13 | 13 | 0 | 0 |
| ChatGPT | EventsService | unitario | 16 | 16 | 0 | 0 |
| ChatGPT | SalesService | unitario | 13 | **10** | **3** | 0 |
| ChatGPT | UsersController | integracao | 15 | 15 | 0 | 0 |
| ChatGPT | EventsController | integracao | 16 | 16 | 0 | 0 |
| ChatGPT | SalesController | integracao | 15 | 15 | 0 | 0 |
| DeepSeek | UsersService | unitario | 19 | **18** | **1** | 0 |
| DeepSeek | EventsService | unitario | 27 | 0 | 0 | 27 |
| DeepSeek | SalesService | unitario | 18 | 0 | 0 | 18 |
| DeepSeek | UsersController | integracao | 31 | 0 | 0 | 31 |
| DeepSeek | EventsController | integracao | 36 | 0 | 0 | 36 |
| DeepSeek | SalesController | integracao | 36 | 0 | 0 | 36 |

---

## Falhas em Tempo de Execução — ChatGPT SalesService (3 falhas, estado histórico)

A suíte `chatgpt/unit/sales.service.spec.ts` compilou e foi executada contra a versão
original do `SalesService` (lock via TypeORM nativo). 3 de 13 testes falharam por
limitações do mock gerado pelo ChatGPT.

| # | Nome do Teste | Causa da Falha |
|---|---|---|
| 1 | `create > deve lançar NotFoundException quando evento não existir` | Mock não diferencia duas chamadas a `findOne` — retorna `undefined` na busca pelo ticket |
| 2 | `create > deve falhar para quantidade inválida` | Serviço não valida `quantity === 0` na camada de service; validação ocorre no DTO/Controller |
| 3 | `cancel > deve lançar BadRequestException quando venda já estiver cancelada` | Mock de `manager.findOne(Sale)` retorna `undefined`; teste esperava uma venda já cancelada |

---

## Falha em Tempo de Execução — DeepSeek UsersService (1 falha, estado histórico)

| # | Nome do Teste | Causa da Falha |
|---|---|---|
| 1 | `update > should throw ConflictException when updating to an email that is already in use` | Double-call: `mockResolvedValueOnce` esgotado na 1ª chamada; 2ª chamada retorna `undefined` → `NotFoundException` |

---

## Erros de Compilação TypeScript (DeepSeek — 5 suítes)

Cinco das seis suítes do DeepSeek falharam ao compilar antes de qualquer teste ser
executado. A causa raiz é **alucinação de campos** nas entidades: o modelo gerou código
usando nomes de propriedades inexistentes na tipagem real da aplicação.

### Campos alucinados vs. campos reais

| Entidade | Campo alucinado (DeepSeek) | Campo real (codebase) | Erro TS primário |
|----------|---------------------------|----------------------|-----------------|
| `Event` | `name` | `title` | TS2352 / TS2353 |
| `Event` | `tickets` | _(sem relação inversa)_ | TS2352 |
| `Event` | `updatedAt` | _(sem coluna)_ | TS2352 |
| `Ticket` | `name` | `type` | TS2352 |
| `Ticket` | `createdAt` / `updatedAt` | _(sem colunas)_ | TS2352 |
| `EventStatus` (string literal) | `'active'` | `EventStatus.ACTIVE` | TS2769 |
| `UpdateUserDto.password` | usado sem guarda `undefined` | campo opcional | TS2345 |

### Primeiro erro por suíte

| Suíte | Código TS | Linha | Mensagem (truncada) |
|-------|-----------|------:|---------------------|
| `deepseek/unit/events.service.spec.ts` | `TS2352` | 27 | Conversion of type '{ id: string; name: string; description: string; date: Date; … |
| `deepseek/unit/sales.service.spec.ts` | `TS2352` | 30 | Conversion of type '{ id: string; name: string; price: number; quantity: number; … |
| `deepseek/integration/users.controller.spec.ts` | `TS2345` | 323 | Argument of type 'string \| undefined' is not assignable to parameter of type 'string \| Buffer…' |
| `deepseek/integration/events.controller.spec.ts` | `TS2353` | 33 | Object literal may only specify known properties, and 'name' does not exist in type 'CreateEventDto' |
| `deepseek/integration/sales.controller.spec.ts` | `TS2740` | 117 | Type 'DeepPartial<Event>[]' is missing the following properties from type 'Event': id, title, description, date, and 6 more |

---

## Arquivos para Reprodutibilidade Histórica

A pasta `historico/` contém os dois artefatos necessários para reproduzir exatamente
as condições de coleta de abril/2026, caso seja necessário reexecutar as suítes no futuro.

| Arquivo | O que é | Por que foi preservado |
|---|---|---|
| `historico/sales.service-snapshot-2026-04-27.ts` | Código-fonte do `SalesService` de 27/04/2026, extraído do VS Code Local History (`2d79181b/Fco6.ts`). Usa `lock: { mode: 'pessimistic_write' }` via TypeORM nativo — sem `manager.query()`. | Necessário para reproduzir o resultado 10/3 da suíte ChatGPT SalesService. O código evoluiu para SQL bruto antes do commit final. |
| `historico/users.service.spec-deepseek-double-call-2026-04.ts` | Arquivo de teste do DeepSeek UsersService com o padrão double-call restaurado (baseado no arquivo commitado, com a linha `const promise = ...` substituída por duas chamadas independentes a `service.update()`). | Necessário para reproduzir o resultado 18/1 da suíte DeepSeek UsersService. O teste foi corrigido para single-promise antes do commit final. |

Para reexecutar essas suítes no estado histórico, basta:
1. Copiar `historico/sales.service-snapshot-2026-04-27.ts` para `src/sales/sales.service.ts`
2. Copiar `historico/users.service.spec-deepseek-double-call-2026-04.ts` para `src/tests-ia/deepseek/unit/users.service.spec.ts`
3. Executar as suítes normalmente
4. Restaurar os arquivos originais pelo git (`git checkout -- src/...`)

---

## Arquivos de Evidência

```
evidencias-tcc/
├── historico/                                    ← artefatos para reprodução histórica
│   ├── sales.service-snapshot-2026-04-27.ts      ← SalesService de abril/2026 (reproduz 10/3)
│   └── users.service.spec-deepseek-double-call-2026-04.ts  ← spec DeepSeek c/ double-call (reproduz 18/1)
├── logs/                                         ← 24 arquivos (.txt e .json por suíte)
│   ├── chatgpt-unit-users-service.txt / .json
│   ├── chatgpt-unit-events-service.txt / .json
│   ├── chatgpt-unit-sales-service.txt / .json    ← estado histórico (abril/2026) → 10/3
│   ├── chatgpt-int-users-controller.txt / .json
│   ├── chatgpt-int-events-controller.txt / .json
│   ├── chatgpt-int-sales-controller.txt / .json
│   ├── deepseek-unit-users-service.txt / .json   ← estado histórico (abril/2026) → 18/1
│   ├── deepseek-unit-events-service.txt / .json
│   ├── deepseek-unit-sales-service.txt / .json
│   ├── deepseek-int-users-controller.txt / .json
│   ├── deepseek-int-events-controller.txt / .json
│   └── deepseek-int-sales-controller.txt / .json
├── rastreabilidade_completa.csv                  ← 255 linhas (1 por caso de teste)
├── resumo.md                                     ← este arquivo
├── sales.service-snapshot-2026-04-27.ts          ← cópia do snapshot (referência rápida)
├── users.service.spec-snapshot-2026-04-27.ts     ← snapshot bruto do VS Code Local History (27/04)
├── users.service.spec-snapshot-2026-04-28.ts     ← snapshot do VS Code Local History (28/04)
├── nota-versao-abril.md                          ← análise da divergência do SalesService
└── nota-versao-deepseek-users.md                 ← análise da divergência do DeepSeek UsersService
```

---

_Gerado em: 2026-07-01 — Ambiente: Node.js v20.20.0, Jest 30.4.1, ts-jest 29.2.5_  
_Evidências consolidadas em: 2026-07-02 (pasta historico/ adicionada para reprodutibilidade)_
