# Resultados do Experimento

## Placar Final do Experimento

| Módulo | Tipo | ChatGPT (passaram/gerados) | DeepSeek (passaram/gerados) |
|---|---|---|---|
| UsersService | Unitário | 13/13 ✅ | 18/19 ⚠️ |
| EventsService | Unitário | 16/16 ✅ | 0/27 ❌ |
| SalesService | Unitário | 10/13 ⚠️ | 0/18 ❌ |
| UsersController | Integração | 15/15 ✅ | 0/31 ❌ |
| EventsController | Integração | 16/16 ✅ | 0/36 ❌ |
| SalesController | Integração | 15/15 ✅ | 0/36 ❌ |

**ChatGPT: 85/88 testes passaram (96,6%)**
**DeepSeek: 18/167 testes passaram (10,8%)**

## Metodologia de Registro
- Correções de import path não são contabilizadas como falha (problema de contexto, não de qualidade)
- Falhas por lógica de teste incorreta são contabilizadas como falha real
- Refinamentos = número de correções manuais necessárias além do ajuste de import

## Testes Unitários

### UsersService
| Modelo | Testes Gerados | Passaram | Falharam | Refinamentos | Observações |
|---|---|---|---|---|---|
| ChatGPT | 13 | 13 | 0 | 0 | Ajuste de import path |
| DeepSeek | 19 | 18 | 1 | 1 | Ajuste de import path + mock incorreto no teste update com email duplicado |

### EventsService
| Modelo | Testes Gerados | Passaram | Falharam | Refinamentos | Observações |
|---|---|---|---|---|---|
| ChatGPT | 16 | 16 | 0 | 0 | Ajuste de import path |
| DeepSeek | 27 | 0 | 27 — todos (falha de compilação) | 0 | Falha total de compilação. Causa: campo `name` usado em vez de `title` em toda a suite — 12 erros TS2339/TS2353, 3 erros TS2352 de tipo incompatível, 2 erros de `date: string` vs `Date`. Mesma causa-raiz do SalesService: modelo alucionou a estrutura das entidades sem ler o código fornecido |

### SalesService
| Modelo | Testes Gerados | Passaram | Falharam | Refinamentos | Observações |
|---|---|---|---|---|---|
| ChatGPT | 13 | 10 | 3 | 0 | Ajuste de import path. Falhas: (1) mock consumido antes de testar evento não encontrado, (2) teste pressupõe validação no serviço mas ela existe apenas no DTO, (3) mock de cancel não retorna venda cancelada corretamente |
| DeepSeek | 18 | 0 | 18 — todos (falha de compilação) | 0 | Suite inteira falhou na compilação — nenhum teste executado. Causa: campos inventados nas entidades (name, tickets, updatedAt inexistentes) e tipagem incorreta do mock de DataSource.transaction com jest.Mocked\<DataSource\> |

## Testes de Integração

### UsersController
| Modelo | Testes Gerados | Passaram | Falharam | Refinamentos | Observações |
|---|---|---|---|---|---|
| ChatGPT | 15 | 15 | 0 | 0 | Ajuste de import path |
| DeepSeek | 31 | 0 | 31 — todos (falha de compilação) | 0 | Falha total de compilação. Causa: `updateData.password` é `string \| undefined` mas `bcrypt.compare` espera `string \| Buffer` — TS2345 na linha 323. Modelo não considerou que `password` é opcional no `UpdateUserDto` |

### EventsController
| Modelo | Testes Gerados | Passaram | Falharam | Refinamentos | Observações |
|---|---|---|---|---|---|
| ChatGPT | 16 | 16 | 0 | 0 | Ajuste de import path |
| DeepSeek | 36 | 0 | 36 — todos (falha de compilação) | 0 | Falha total de compilação. Causa: campo `name` usado em vez de `title` em DTOs e entidade — mesma causa-raiz da suite unitária. 13 erros TS2353/TS2339 espalhados por toda a suite |

### SalesController
| Modelo | Testes Gerados | Passaram | Falharam | Refinamentos | Observações |
|---|---|---|---|---|---|
| ChatGPT | 15 | 15 | 0 | 0 | Ajuste de import path + remoção de `import { beforeEach, describe, it } from 'node:test'`. Bug real da API corrigido (FOR UPDATE + LEFT JOIN) |
| DeepSeek | 36 | 0 | 36 — todos (falha de compilação) | 0 | Falha total de compilação. Causa: campo `name` usado em vez de `title` no Event e `name` em vez de `type` no Ticket (3 ocorrências cada), e `status: 'active'` (string) em vez de `EventStatus.ACTIVE` (enum) |

## Cobertura de Código

### ChatGPT
*Medição combinada: unit + integration rodados juntos. Interferência entre suites de integração (banco compartilhado) causou falhas adicionais que afetam parcialmente os números dos controllers.*

| Arquivo | % Stmts | % Branch | % Funcs | % Lines | Linhas não cobertas |
|---|---|---|---|---|---|
| users.service.ts | 100% | 91,66% | 100% | 100% | 52 |
| users.controller.ts | 82,35% | 100% | 40% | 80% | 30, 36, 43 |
| events.service.ts | 100% | 100% | 100% | 100% | — |
| events.controller.ts | 95,23% | 100% | 83,33% | 94,73% | 42 |
| sales.service.ts | 61,7% | 57,14% | 100% | 60% | 36–79, 114–130 |
| sales.controller.ts | 77,77% | 100% | 20% | 75% | 24, 29, 34, 40 |

> `sales.service.ts`: cobertura reduzida por bug fix pós-geração — adição de `manager.query()` não prevista nos mocks unitários, deixando os blocos `create` e `cancel` inacessíveis nos testes unitários (linhas 36–79, 114–130).
> `users.controller.ts` e `sales.controller.ts`: funções não cobertas correspondem a endpoints não testados pelos testes unitários (cobertos apenas por integração, onde houve interferência).

### DeepSeek
*Cobertura parcial — apenas UsersService executou. As demais 5 suites falharam na compilação devido à alucinação de campos nas entidades, impossibilitando a coleta de cobertura.*

| Arquivo | % Stmts | % Branch | % Funcs | % Lines | Observações |
|---|---|---|---|---|---|
| users.service.ts | 100% | 100% | 100% | 100% | Cobertura total |
| events.service.ts | N/A | N/A | N/A | N/A | Falha de compilação — campo `name` em vez de `title` |
| sales.service.ts | N/A | N/A | N/A | N/A | Falha de compilação — `jest.Mocked<DataSource>` incorreto |
| users.controller.ts | N/A | N/A | N/A | N/A | Falha de compilação — `password` opcional não considerado |
| events.controller.ts | N/A | N/A | N/A | N/A | Falha de compilação — campo `name` em vez de `title` |
| sales.controller.ts | N/A | N/A | N/A | N/A | Falha de compilação — `name`/`type` incorretos + enum como string |

## Métricas Qualitativas

### ChatGPT
| Suite | Clareza | Boas Práticas | Manutenibilidade | Média |
|---|---|---|---|---|
| UsersService (unit) | 3 | 3 | 3 | 3,0 |
| EventsService (unit) | 3 | 2 | 2 | 2,33 |
| SalesService (unit) | 3 | 3 | 3 | 3,0 |
| UsersController (integration) | 3 | 2 | 2 | 2,33 |
| EventsController (integration) | 3 | 3 | 2 | 2,67 |
| SalesController (integration) | 3 | 3 | 2 | 2,67 |
| **Média Geral** | **3,0** | **2,67** | **2,33** | **2,67** |

### DeepSeek
| Suite | Clareza | Boas Práticas | Manutenibilidade | Média |
|---|---|---|---|---|
| UsersService (unit) | 3 | 3 | 2 | 2,67 |
| EventsService (unit) | N/A | N/A | N/A | N/A |
| SalesService (unit) | N/A | N/A | N/A | N/A |
| UsersController (integration) | N/A | N/A | N/A | N/A |
| EventsController (integration) | N/A | N/A | N/A | N/A |
| SalesController (integration) | N/A | N/A | N/A | N/A |
| **Média Geral** | **3,0** | **3,0** | **2,0** | **2,67** |

### Observações Qualitativas

**ChatGPT:**
- Ponto recorrente: alguns testes chamam o mesmo método duas vezes no mesmo caso para testar tipo e mensagem do erro separadamente, o que prejudica manutenção e pode interferir nos mocks sequenciais
- Uso frequente de `as any` para tipagem de mocks
- Testes de integração dependem de TRUNCATE direto em tabelas, o que pode ser sensível dependendo do ambiente
- Alguns comentários indicam necessidade de ajuste manual de rotas, reduzindo a manutenibilidade
- EventsService: nomes de testes incoerentes em `create` — testes nomeados "deve falhar" mas que esperam sucesso
- SalesService: teste de quantidade inválida usa `rejects.toBeDefined()`, genérico demais

**DeepSeek (UsersService único avaliado):**
- Melhor estruturado que o ChatGPT em mocks e tipagem
- Alguns testes conceitualmente confusos — valida formato dentro do service, sendo que a validação deveria estar no DTO
- Chamadas duplicadas em alguns `rejects.toThrow`, prejudicando manutenção
- Avaliação qualitativa parcial — apenas 1 das 6 suites compilou

## Observações Gerais

## Achados Adicionais

### Bug real descoberto pelos testes de integração
Os testes de integração gerados pelo ChatGPT para o SalesController revelaram um bug real na API: o PostgreSQL rejeita a combinação de FOR UPDATE com LEFT JOIN. As relações `eager: true` no Ticket (para Event) e no Event (para User) geravam JOINs automáticos incompatíveis com o lock pessimista. O bug foi corrigido substituindo os locks por raw SQL (`SELECT ... FOR UPDATE` sem JOINs). Esse achado demonstra o valor prático dos testes de integração na identificação de problemas reais de produção.

### Padrão de falha recorrente do DeepSeek
O DeepSeek apresentou um padrão de falha consistente em 5 das 6 suites geradas: alucinação de campos nas entidades do projeto. O modelo utilizou `name` em vez de `title` na entidade Event, `name` em vez de `type` na entidade Ticket, e campos inexistentes como `tickets` e `updatedAt`. Esse comportamento, identificado por Yuan et al. (2024) como *unawareness of deep knowledge in the code*, resultou em falha total de compilação em todas as suites afetadas, impossibilitando a execução de qualquer teste.

### DeepSeek — comportamento nos testes de integração
Em todas as suites de integração geradas, o DeepSeek incluiu instruções para modificar arquivos de infraestrutura do projeto (`.env`, `jest-e2e.json`, `app.module.ts`), sugerindo variáveis de ambiente diferentes das existentes (`DATABASE_HOST` em vez de `DB_HOST`, `test_user` em vez de `postgres`). Esse comportamento indica que o modelo não inferiu o ambiente existente a partir do código fornecido, impactando negativamente as métricas de manutenibilidade.
