<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ yarn install
```

## Compile and run the project

```bash
# development
$ yarn run start

# watch mode
$ yarn run start:dev

# production mode
$ yarn run start:prod
```

## Run tests

```bash
# unit tests
$ yarn run test

# e2e tests
$ yarn run test:e2e

# test coverage
$ yarn run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ yarn install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).

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
