# TCC

API REST de referência desenvolvida para o Trabalho de Conclusão de Curso:

> **"Estudo de caso comparativo: avaliação de modelos de IA generativa na criação de testes automatizados para APIs web"**
> João Inácio Carlesso Ruguzzoni — UNOCHAPECÓ, 2026

---

## Stack

| Camada | Tecnologia |
|---|---|
| Runtime | Node.js 20 |
| Framework | NestJS 11 |
| Linguagem | TypeScript 5 |
| Banco de dados | PostgreSQL 15/16 |
| ORM | TypeORM 0.3 |
| Testes | Jest + Supertest |
| Infraestrutura | Docker Compose |

---

## Estrutura do projeto

A API é organizada em quatro módulos de domínio com autenticação JWT:

- **Users** — cadastro, atualização e soft delete de usuários
- **Events** — criação e gerenciamento de eventos
- **Tickets** — emissão de ingressos vinculados a eventos
- **Sales** — registro de vendas com controle de estoque e lock pessimista

```
src/
├── auth/           # JWT strategy e guard
├── users/
├── events/
├── tickets/
├── sales/
├── tests-ia/       # Suítes geradas por IA (ver seção abaixo)
│   ├── chatgpt/
│   │   ├── unit/
│   │   └── integration/
│   └── deepseek/
│       ├── unit/
│       └── integration/
└── database/       # DataSource, seed e smoke-test
```

---

## Instalação e execução

```bash
# Instalar dependências
yarn install

# Configurar variáveis de ambiente (obrigatório para testes de integração)
cp .env.example .env
# Edite .env se necessário — os valores padrão funcionam com o docker-compose.yml incluído

# Subir os containers PostgreSQL (porta 5432 = aplicação, 5433 = testes)
docker compose up -d

# Iniciar em modo desenvolvimento
yarn start:dev
```

---

## Testes

```bash
# Rodar todas as suítes
yarn test

# Rodar testes end-to-end
yarn test:e2e
```

> Os containers PostgreSQL precisam estar ativos antes de rodar os testes de integração.

---

## Experimento do TCC

As suítes de teste geradas por IA estão em `src/tests-ia/`, organizadas por modelo e nível:

| Modelo | Nível | Suíte |
|---|---|---|
| ChatGPT | Unitário | `chatgpt/unit/users.service.spec.ts` |
| ChatGPT | Unitário | `chatgpt/unit/events.service.spec.ts` |
| ChatGPT | Unitário | `chatgpt/unit/sales.service.spec.ts` |
| ChatGPT | Integração | `chatgpt/integration/users.controller.spec.ts` |
| ChatGPT | Integração | `chatgpt/integration/events.controller.spec.ts` |
| ChatGPT | Integração | `chatgpt/integration/sales.controller.spec.ts` |
| DeepSeek | Unitário | `deepseek/unit/users.service.spec.ts` |
| DeepSeek | Unitário | `deepseek/unit/events.service.spec.ts` |
| DeepSeek | Unitário | `deepseek/unit/sales.service.spec.ts` |
| DeepSeek | Integração | `deepseek/integration/users.controller.spec.ts` |
| DeepSeek | Integração | `deepseek/integration/events.controller.spec.ts` |
| DeepSeek | Integração | `deepseek/integration/sales.controller.spec.ts` |

Os artefatos completos de reprodutibilidade do experimento — estado histórico do código (abril/2026), logs de execução, planilha de rastreabilidade caso a caso e documentação metodológica — estão disponíveis na branch e tag abaixo:

- **Branch:** [`experimento-abril-2026`](https://github.com/joaaoinacio/TCC/tree/experimento-abril-2026)
- **Tag:** [`v1.0-tcc-abril2026`](https://github.com/joaaoinacio/TCC/releases/tag/v1.0-tcc-abril2026)

---

## Documento do TCC

O documento completo está disponível mediante solicitação ao autor:
**joaaoinacio@unochapeco.edu.br**

---

## Reprodutibilidade do experimento (TCC)

> **Nota:** Esta branch (`experimento-abril-2026`) corresponde ao estado do código e dos
> testes utilizado na coleta de dados reportada na **Seção 3.7 do TCC**
> (abril de 2026). Os resultados documentados são: **85/88 testes aprovados (ChatGPT)**
> e **18/167 testes aprovados (DeepSeek)**.

### Pré-requisitos

| Requisito | Versão |
|---|---|
| Node.js | v20.20.0 |
| Yarn | >= 1.22 |
| Jest | 30.4.1 (via `node_modules`) |
| ts-jest | 29.2.5 |
| Docker | PostgreSQL 16-alpine (duas instâncias) |

```bash
# Instalar dependências
yarn install

# Configurar variáveis de ambiente (obrigatório para testes de integração)
cp .env.example .env
# Edite .env se necessário — os valores padrão funcionam com o docker-compose.yml incluído

# Subir os dois containers PostgreSQL antes de rodar qualquer teste
docker compose up -d
```

---

### Por que existem dois estados do `SalesService`

A coleta de dados do TCC abrangeu dois momentos distintos do desenvolvimento do projeto.
Entre eles, o `SalesService` foi refatorado para corrigir um bug de locking pessimista.

#### O bug original (versão de abril/2026)

O `SalesService` usava a API nativa do TypeORM para lock pessimista:

```typescript
// Versão abril/2026 — lock via TypeORM (pessimistic_write)
const ticket = await manager.findOne(Ticket, {
  where: { id: dto.ticketId },
  relations: { event: true },         // ← gera LEFT JOIN
  lock: { mode: 'pessimistic_write' }, // ← gera FOR UPDATE
});
```

Essa combinação (`FOR UPDATE + LEFT JOIN`) é rejeitada pelo PostgreSQL em transações
reais. O erro só se manifesta contra um banco de dados real — em testes unitários com
mock, a opção `lock` é simplesmente ignorada pelo Jest.

#### A correção (versão pós-refatoração — código atual)

```typescript
// Versão atual — lock via SQL bruto (evita o LEFT JOIN)
const ticket = await manager.findOne(Ticket, {
  where: { id: dto.ticketId },
  relations: { event: true },
});
await manager.query('SELECT id FROM tickets WHERE id = $1 FOR UPDATE', [ticket.id]);
await manager.query('SELECT id FROM events WHERE id = $1 FOR UPDATE', [ticket.event.id]);
```

#### Consequência para os resultados do TCC

| Suíte | Estado do `SalesService` | Resultado |
|---|---|---|
| ChatGPT `unit/sales.service.spec.ts` | **Versão abril (sem `query()`)** | **10/13** |
| ChatGPT `integration/sales.controller.spec.ts` | **Versão atual (com `query()`)** | **15/15** |

- Os testes **unitários** foram coletados **antes** da refatoração → o mock do ChatGPT
  passava porque `query()` nunca era chamado.
- Os testes de **integração** foram coletados **depois** da refatoração → funcionam
  contra o PostgreSQL real com SQL bruto.

---

### Comandos de reprodução

#### `npm run test` — estado atual do código (pós-correção)

Reproduz **82/88** dos testes ChatGPT executados (os 10 da suíte unitária do
SalesService ficam com 7/13 porque o mock do ChatGPT não tem `query()`):

```bash
# Roda todas as 12 suítes individualmente — os testes de integração devem ser
# executados um por vez para evitar deadlocks entre suítes no PostgreSQL
npx jest src/tests-ia/chatgpt/unit/users.service.spec.ts --no-coverage
npx jest src/tests-ia/chatgpt/unit/events.service.spec.ts --no-coverage
npx jest src/tests-ia/chatgpt/unit/sales.service.spec.ts --no-coverage    # → 7/13
npx jest src/tests-ia/chatgpt/integration/users.controller.spec.ts --no-coverage
npx jest src/tests-ia/chatgpt/integration/events.controller.spec.ts --no-coverage
npx jest src/tests-ia/chatgpt/integration/sales.controller.spec.ts --no-coverage
npx jest src/tests-ia/deepseek/unit/users.service.spec.ts --no-coverage
npx jest src/tests-ia/deepseek/unit/events.service.spec.ts --no-coverage
npx jest src/tests-ia/deepseek/unit/sales.service.spec.ts --no-coverage
npx jest src/tests-ia/deepseek/integration/users.controller.spec.ts --no-coverage
npx jest src/tests-ia/deepseek/integration/events.controller.spec.ts --no-coverage
npx jest src/tests-ia/deepseek/integration/sales.controller.spec.ts --no-coverage
```

#### `npm run test:sales-historical` — reproduz o resultado original do TCC (10/13)

Este comando faz a troca do arquivo automaticamente e o restaura ao final, inclusive
em caso de falha:

```bash
npm run test:sales-historical
# ou: yarn test:sales-historical
```

O script `scripts/run-sales-historical-test.sh`:
1. Faz backup de `src/sales/sales.service.ts`
2. Substitui pela versão histórica de abril/2026 (`evidencias-tcc/historico/sales.service-snapshot-2026-04-27.ts`)
3. Roda apenas `chatgpt/unit/sales.service.spec.ts` → **10 passaram / 3 falharam**
4. Restaura o arquivo original via `trap EXIT` (garantido mesmo se o teste falhar)

Resultado esperado: `Tests: 3 failed, 10 passed, 13 total`

> **Verificado em 02/07/2026:** após a execução, `git diff src/sales/sales.service.ts`
> retorna vazio (zero mudanças residuais) e `integration/sales.controller.spec.ts`
> continua passando **15/15** com o arquivo restaurado.

#### Testes de integração — sempre com o código atual

Os testes de integração do ChatGPT SalesController **dependem da correção** para
funcionar contra o PostgreSQL real. Nunca rodar com a versão histórica do `SalesService`:

```bash
# Sempre rodar individualmente (deadlocks ocorrem quando executados em conjunto)
npx jest src/tests-ia/chatgpt/integration/sales.controller.spec.ts --no-coverage  # → 15/15
```

---

### Rastreabilidade completa

O arquivo com o resultado caso a caso (255 linhas, uma por teste) está em:

```
evidencias/rastreabilidade_completa.csv
```

Colunas: `id, modulo, nivel, modelo, nome_do_teste, resultado, erro_ts_code, erro_mensagem, arquivo, linha`
