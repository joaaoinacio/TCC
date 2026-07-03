# TCC API — NestJS REST API

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

# Configurar variáveis de ambiente
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
