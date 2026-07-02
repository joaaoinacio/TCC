#!/usr/bin/env bash
# Roda a suíte unitária do ChatGPT SalesService contra a versão histórica do
# SalesService (abril/2026), reproduzindo o resultado 10/3 reportado na Tabela 1
# do TCC. O arquivo src/sales/sales.service.ts é restaurado automaticamente ao
# final, independentemente de o teste ter passado ou falhado.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SERVICE_FILE="$REPO_ROOT/src/sales/sales.service.ts"
SNAPSHOT_FILE="$REPO_ROOT/evidencias-tcc/historico/sales.service-snapshot-2026-04-27.ts"
BACKUP_FILE="$REPO_ROOT/src/sales/sales.service.ts.bak"

if [[ ! -f "$SNAPSHOT_FILE" ]]; then
  echo "ERRO: snapshot histórico não encontrado em:"
  echo "  $SNAPSHOT_FILE"
  exit 1
fi

restore() {
  if [[ -f "$BACKUP_FILE" ]]; then
    mv "$BACKUP_FILE" "$SERVICE_FILE"
    echo ""
    echo ">> sales.service.ts restaurado ao estado original."
  fi
}
trap restore EXIT

echo ">> Fazendo backup de src/sales/sales.service.ts..."
cp "$SERVICE_FILE" "$BACKUP_FILE"

echo ">> Substituindo pelo snapshot de abril/2026..."
cp "$SNAPSHOT_FILE" "$SERVICE_FILE"

echo ">> Rodando suíte unitária ChatGPT SalesService..."
echo ""

set +e
npx jest "$REPO_ROOT/src/tests-ia/chatgpt/unit/sales.service.spec.ts" \
  --verbose --no-coverage \
  --rootDir "$REPO_ROOT"
TEST_EXIT=$?
set -e

# restore() é chamada automaticamente pelo trap EXIT
exit $TEST_EXIT
