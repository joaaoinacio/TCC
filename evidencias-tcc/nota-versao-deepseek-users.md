# Nota — Investigação da Versão Original do DeepSeek UsersService (27–28/04/2026)

## Contexto

O TCC documenta que a suíte `deepseek/unit/users.service.spec.ts` produziu
**18 passaram / 1 falhou** na coleta original. Ao rodar a versão commitada no
GitHub, o resultado é **19 passaram / 0 falharam**. Esta nota registra a
investigação da divergência.

---

## Snapshots encontrados no VS Code Local History

| Arquivo | Data | Origem |
|---|---|---|
| `users.service.spec-snapshot-2026-04-27.ts` (SiwO.ts) | 27/04/2026 23:24:08 | `src/tests-ia/deepseek/users.service.spec.ts` |
| `users.service.spec-snapshot-2026-04-28.ts` (Ayma.ts) | 28/04/2026 09:53:06 | `src/tests-ia/deepseek/users.service.spec.ts` |

O arquivo foi movido de `deepseek/` para `deepseek/unit/` em algum momento entre
abril e junho de 2026, e depois o único commit (22/06/2026) consolidou a versão final.

---

## Diferenças entre os snapshots e a versão commitada

### Snapshot de 27/04 (SiwO.ts) → Snapshot de 28/04 (Ayma.ts)

| Aspecto | SiwO.ts (abr/27) | Ayma.ts (abr/28) |
|---|---|---|
| Caminhos de import | `'./dto/...'` / `'./users.service'` (quebrados) | `'../../users/...'` (corretos para `deepseek/`) |
| Import `node:test` | Presente | Presente |
| Teste `ConflictException update` | **Double-call** (chama `service.update()` 2×) | **Single-promise** (corrigido) |

### Snapshot de 28/04 (Ayma.ts) → versão commitada

| Aspecto | Ayma.ts (abr/28) | Commitada (jun/22) |
|---|---|---|
| Caminhos de import | `'../../users/...'` | `'../../../users/...'` (arquivo movido para `unit/`) |
| Import `node:test` | **Presente** | **Removido** |
| Teste `ConflictException update` | Single-promise | Single-promise (sem mudança) |

---

## Efeito do `import { describe, it } from 'node:test'`

Verificado empiricamente na branch `teste-deepseek-users` em 01/07/2026:

> Com o import presente, **Jest registra 0 testes e a suíte falha**.
> O módulo `node:test` sobrescreve os globais `describe`/`it` do Jest com suas
> próprias implementações — as chamadas a `describe()` e `it()` dentro do arquivo
> vão para o runner do Node.js, não para o Jest. O Jest enxerga um arquivo de
> teste sem nenhum caso registrado.

**Conclusão**: a versão que produziu 18/1 no TCC **não tinha o `import node:test`**
presente. Trata-se de um estado intermediário não capturado pelo Local History —
o arquivo estava com imports corretos, sem `node:test`, mas ainda com o
padrão de double-call no teste `ConflictException`.

---

## A Causa da Falha: Double-Call com Mock Esgotado

O teste problemático é:

```
UsersService › update › should throw ConflictException when updating to an email that is already in use
```

**Padrão de double-call (versão original com o bug):**
```typescript
usersRepository.findOne.mockResolvedValueOnce(mockUser);     // consumido na 1.ª chamada
usersRepository.findOne.mockResolvedValueOnce(existingUser); // consumido na 1.ª chamada

// 1.ª chamada — passa: mock tem valores → lança ConflictException ✓
await expect(service.update(mockUser.id, updateDto)).rejects.toThrow(ConflictException);

// 2.ª chamada — falha: mock esgotado → findOne retorna undefined → lança NotFoundException ✗
await expect(service.update(mockUser.id, updateDto)).rejects.toThrow('Email already in use');
```

**Erro registrado:**
```
Expected substring: "Email already in use"
Received message:   "User not found"
```

**Padrão corrigido (versão commitada):**
```typescript
const promise = service.update(mockUser.id, updateDto); // chamado 1× apenas
await expect(promise).rejects.toThrow(ConflictException);
await expect(promise).rejects.toThrow('Email already in use');
```

---

## Confirmação Experimental

Em **01/07/2026**, na branch `teste-deepseek-users`, o arquivo commitado foi
modificado para restaurar somente o padrão de double-call (sem `node:test`).
O resultado confirmou os números originais do TCC:

```
Tests:  1 failed, 18 passed, 19 total
```

---

## Arquivos deste Conjunto de Evidências

| Arquivo | Descrição |
|---|---|
| `users.service.spec-snapshot-2026-04-27.ts` | Snapshot de 27/04 (imports quebrados + `node:test` + double-call) |
| `users.service.spec-snapshot-2026-04-28.ts` | Snapshot de 28/04 (`node:test` + single-promise + imports corretos para `deepseek/`) |
| `logs/teste-versao-abril-users-deepseek.txt` | Output da execução confirmatória com double-call (18/1) |
| `logs/deepseek-unit-users-service.txt` | Output da execução oficial com versão commitada (19/0) |
