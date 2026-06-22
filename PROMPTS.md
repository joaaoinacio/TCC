Reescreva o arquivo PROMPTS.md completo com o seguinte conteúdo:

# Prompts Utilizados no Experimento

## Informações Gerais
- Prompt único padronizado aplicado de forma idêntica ao ChatGPT e ao DeepSeek
- Modelos utilizados: ChatGPT (versão gratuita) e DeepSeek (versão gratuita)
- Data de execução: abril/maio de 2026
- Cada módulo foi enviado em sessão independente, sem histórico de conversa entre módulos
- Ajustes de import path aplicados após geração não são contabilizados como refinamento

## Prompt Base — Testes Unitários

Instrução fixa aplicada a todos os serviços:

"Você é um desenvolvedor especialista em TypeScript e NestJS. Dado o seguinte código de serviço, gere testes unitários utilizando Jest. Os testes devem cobrir: (1) o caso de sucesso principal, (2) os casos de erro esperados conforme as regras de negócio, e (3) as validações de entrada. Utilize mocks com jest.fn() para todas as dependências externas. Organize os testes com describe/it e nomeie cada caso de forma descritiva.

Código: [CÓDIGO DO MÓDULO]"

Variação aplicada ao SalesService (único módulo com transações):

"Você é um desenvolvedor especialista em TypeScript e NestJS. Dado o seguinte código de serviço, gere testes unitários utilizando Jest. Os testes devem cobrir: (1) o caso de sucesso principal, (2) os casos de erro esperados conforme as regras de negócio, e (3) as validações de entrada. Utilize mocks com jest.fn() para todas as dependências externas. Organize os testes com describe/it e nomeie cada caso de forma descritiva. Atenção: o SalesService usa DataSource com transações — mock o dataSource.transaction para simular o EntityManager internamente.

Código: [CÓDIGO DO MÓDULO]"

## Prompt Base — Testes de Integração

Instrução fixa aplicada a todos os controllers:

"Você é um desenvolvedor especialista em TypeScript e NestJS. Dado o seguinte código de controller, gere testes de integração utilizando Jest e Supertest. Os testes devem cobrir: (1) o caso de sucesso principal com status HTTP correto, (2) os casos de erro esperados com seus respectivos status HTTP, e (3) validações de entrada. Considere que a API está rodando com banco PostgreSQL real via Docker na porta 5433. Use @nestjs/testing com TestingModule para subir o contexto completo da aplicação. Organize os testes com describe/it e nomeie cada caso de forma descritiva.

Código: [CÓDIGO DO CONTROLLER]"

## Prompts Enviados por Módulo

### Testes Unitários

#### UsersService
- **Arquivo de referência:** src/users/users.service.ts
- **Prompt utilizado:** Prompt Base — Testes Unitários (instrução fixa)
- **Código fornecido como contexto:** conteúdo completo do users.service.ts
- **Enviado para:** ChatGPT (versão gratuita) e DeepSeek (versão gratuita)
- **Resultados:** ChatGPT 13/13 ✅ | DeepSeek 18/19 ⚠️

#### EventsService
- **Arquivo de referência:** src/events/events.service.ts
- **Prompt utilizado:** Prompt Base — Testes Unitários (instrução fixa)
- **Código fornecido como contexto:** conteúdo completo do events.service.ts
- **Enviado para:** ChatGPT (versão gratuita) e DeepSeek (versão gratuita)
- **Resultados:** ChatGPT 16/16 ✅ | DeepSeek 0/27 ❌

#### SalesService
- **Arquivo de referência:** src/sales/sales.service.ts
- **Prompt utilizado:** Prompt Base — Testes Unitários (variação com instrução de mock de transação)
- **Código fornecido como contexto:** conteúdo completo do sales.service.ts
- **Enviado para:** ChatGPT (versão gratuita) e DeepSeek (versão gratuita)
- **Resultados:** ChatGPT 10/13 ⚠️ | DeepSeek 0/18 ❌

### Testes de Integração

#### UsersController
- **Arquivo de referência:** src/users/users.controller.ts
- **Prompt utilizado:** Prompt Base — Testes de Integração
- **Código fornecido como contexto:** conteúdo completo do users.controller.ts
- **Enviado para:** ChatGPT (versão gratuita) e DeepSeek (versão gratuita)
- **Resultados:** ChatGPT 15/15 ✅ | DeepSeek 0/31 ❌

#### EventsController
- **Arquivo de referência:** src/events/events.controller.ts
- **Prompt utilizado:** Prompt Base — Testes de Integração
- **Código fornecido como contexto:** conteúdo completo do events.controller.ts
- **Enviado para:** ChatGPT (versão gratuita) e DeepSeek (versão gratuita)
- **Resultados:** ChatGPT 16/16 ✅ | DeepSeek 0/36 ❌

#### SalesController
- **Arquivo de referência:** src/sales/sales.controller.ts
- **Prompt utilizado:** Prompt Base — Testes de Integração
- **Código fornecido como contexto:** conteúdo completo do sales.controller.ts
- **Enviado para:** ChatGPT (versão gratuita) e DeepSeek (versão gratuita)
- **Resultados:** ChatGPT 15/15 ✅ | DeepSeek 0/36 ❌

## Ajustes Aplicados Após Geração

### Ajuste padrão — ambos os modelos (não contabilizado como refinamento)
Correção de caminhos de import relativos. Os modelos geraram imports como `./users.service` que foram corrigidos para `../../users/users.service`. Nos testes de integração, o AppModule foi corrigido de `../src/app.module` para `../../../app.module`. O import do Supertest foi corrigido de `import * as request from 'supertest'` para `import request from 'supertest'`. Esses ajustes foram aplicados de forma idêntica para os dois modelos e não são contabilizados como falha, pois decorrem da diferença entre o contexto de geração e a estrutura real do projeto.

### Ajustes por falha de lógica (contabilizados como falha)
| Modelo | Módulo | Descrição da falha |
|---|---|---|
| DeepSeek | UsersService | Mock incorreto no teste de update com email duplicado — dois rejects encadeados consumindo a mesma promise |
| ChatGPT | SalesService | 3 falhas: mock consumido antes de testar evento não encontrado; teste pressupõe validação no serviço mas ela existe apenas no DTO; mock de cancel não retorna venda cancelada corretamente |
| DeepSeek | EventsService | Falha de compilação — campo name usado em vez de title em toda a suite |
| DeepSeek | SalesService | Falha de compilação — jest.Mocked<DataSource> incorreto + campos inventados nas entidades |
| DeepSeek | UsersController | Falha de compilação — password opcional não considerado no bcrypt.compare |
| DeepSeek | EventsController | Falha de compilação — campo name em vez de title nos DTOs |
| DeepSeek | SalesController | Falha de compilação — name/type incorretos + enum como string |